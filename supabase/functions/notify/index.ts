// Sends an Expo push notification for a nudge.
// Called by the app right after it sends a nudge (→ recipient) or replies to one (→ sender).
// The caller must be the nudge's sender or recipient; RLS on the user-scoped client enforces that.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const LABEL: Record<string, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
/** Only fresh events are pushed, so a replayed request can't spam anyone. */
const FRESH_MS = 2 * 60_000;

/** Minutes since local midnight in `tz`. */
function localMinutes(tz: string | null) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz ?? "UTC" }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
function inQuietHours(start: string | null, end: string | null, tz: string | null) {
  if (!start || !end) return false;
  const now = localMinutes(tz), s = toMinutes(start), e = toMinutes(end);
  return s <= e ? now >= s && now < e : now >= s || now < e;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { nudge_id } = await req.json().catch(() => ({}));
    if (typeof nudge_id !== "string") return Response.json({ error: "nudge_id required" }, { status: 400 });
    const me = ctx.userClaims?.id;

    const { data: n, error } = await ctx.supabase
      .from("nudges")
      .select("id, kind, prayer, message, response, responded_at, created_at, from_user, to_user")
      .eq("id", nudge_id)
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!n) return Response.json({ error: "Not found" }, { status: 404 });

    const isReply = n.to_user === me && !!n.response;
    const isSend = n.from_user === me && !n.response;
    const at = isReply ? n.responded_at : n.created_at;
    if ((!isReply && !isSend) || !at || Date.now() - new Date(at).getTime() > FRESH_MS) {
      return Response.json({ sent: 0, skipped: "not eligible" });
    }

    const actor = me!;
    const target = isReply ? n.from_user : n.to_user;
    const admin = ctx.supabaseAdmin;
    const [{ data: who }, { data: target_profile }, { data: settings }, { data: tokens }] = await Promise.all([
      admin.from("profiles").select("display_name").eq("id", actor).single(),
      admin.from("profiles").select("timezone").eq("id", target).single(),
      admin.from("reminder_settings").select("allow_nudges, quiet_start, quiet_end").eq("user_id", target).maybeSingle(),
      admin.from("push_tokens").select("token").eq("user_id", target),
    ]);
    if (!tokens?.length) return Response.json({ sent: 0, skipped: "no devices" });
    if (!isReply && settings && !settings.allow_nudges) return Response.json({ sent: 0, skipped: "nudges off" });
    const quiet = inQuietHours(settings?.quiet_start ?? null, settings?.quiet_end ?? null, target_profile?.timezone ?? null);

    const name = who?.display_name || "Someone";
    const prayer = LABEL[n.prayer] ?? n.prayer;
    const title = isReply
      ? `${name} replied`
      : n.kind === "together"
        ? `${name} wants to pray ${prayer} together`
        : n.kind === "dua"
          ? `${name} made duʿāʾ for you`
          : n.kind === "voice"
            ? `${name} sent you a voice note`
            : `${name} nudged you for ${prayer}`;
    const body = isReply ? n.response : n.message || (n.kind === "dua" ? "May Allah make it easy for you." : `Don’t miss ${prayer}.`);

    const messages = tokens.map(({ token }) => ({
      to: token,
      title,
      body,
      sound: quiet ? null : "default",
      priority: quiet ? "normal" : "high",
      channelId: quiet ? "prayer-silent" : "nudges",
      data: { type: "nudge", id: n.id },
    }));
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const out = await res.json().catch(() => null);

    // Forget devices that uninstalled the app.
    const dead = (out?.data ?? [])
      .map((t: { status: string; details?: { error?: string } }, i: number) => (t.details?.error === "DeviceNotRegistered" ? tokens[i].token : null))
      .filter(Boolean);
    if (dead.length) await admin.from("push_tokens").delete().in("token", dead);

    return Response.json({ sent: messages.length - dead.length, quiet });
  }),
};
