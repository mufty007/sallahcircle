// Called by pg_cron (see migration push_cron) with a shared secret.
//   task "due":     send reminders whose time has come (prayer, heads-up, Jumuʿah, fasting, weekly recap)
//   task "cleanup": delete voice notes older than 30 days
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type Row = { user_id: string; key: string; send_at: string; kind: string; title: string; body: string; data: Record<string, unknown>; silent: boolean };
type Ticket = { status: string; details?: { error?: string } };

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const secret = Deno.env.get("CRON_SECRET");
    if (!secret || req.headers.get("x-cron-secret") !== secret) return Response.json({ error: "Forbidden" }, { status: 403 });
    const { task = "due" } = await req.json().catch(() => ({}));
    const admin = ctx.supabaseAdmin;

    if (task === "cleanup") {
      const { data: names, error } = await admin.rpc("voice_notes_older_than", { days: 30 });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      const list = (names ?? []) as string[];
      for (let i = 0; i < list.length; i += 100) await admin.storage.from("voice-notes").remove(list.slice(i, i + 100));
      return Response.json({ removed: list.length });
    }

    const { data: due, error } = await admin.rpc("claim_due_pushes", { max_rows: 500 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const rows = (due ?? []) as Row[];
    if (!rows.length) return Response.json({ sent: 0 });

    const users = [...new Set(rows.map((r) => r.user_id))];
    const { data: tokens } = await admin.from("push_tokens").select("user_id, token").in("user_id", users);
    const byUser = new Map<string, string[]>();
    for (const t of tokens ?? []) byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t.token]);

    const messages: { to: string; title: string; body: string; sound: string | null; priority: string; channelId: string; data: Record<string, unknown> }[] = [];
    for (const r of rows) {
      const to = byUser.get(r.user_id);
      if (!to?.length) continue;
      let body = r.body;
      if (r.kind === "recap") {
        // Numbers are worked out at send time so the whole week counts.
        const since = new Date(new Date(r.send_at).getTime() - 6 * 86_400_000).toISOString().slice(0, 10);
        const { data: w } = await admin.rpc("week_recap", { uid: r.user_id, since });
        const s = (w as { prayed: number; on_time: number; jamaah: number }[] | null)?.[0];
        if (!s) continue;
        body = `You prayed ${s.prayed} of 35 this week, ${s.on_time} on time${s.jamaah ? ` and ${s.jamaah} in jamāʿah` : ""}. ${s.prayed >= 30 ? "MāshāʾAllāh!" : "A fresh week starts now."}`;
      }
      for (const token of to) {
        messages.push({
          to: token,
          title: r.title,
          body,
          sound: r.silent ? null : "default",
          priority: "high",
          channelId: r.silent ? "prayer-silent" : "prayer",
          data: { ...r.data, kind: r.kind },
        });
      }
    }

    let sent = 0;
    const dead: string[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(chunk) });
      const out = await res.json().catch(() => null);
      ((out?.data ?? []) as Ticket[]).forEach((t, j) => {
        if (t.status === "ok") sent++;
        else if (t.details?.error === "DeviceNotRegistered") dead.push(chunk[j].to);
      });
    }
    if (dead.length) await admin.from("push_tokens").delete().in("token", dead);
    return Response.json({ claimed: rows.length, sent, removedTokens: dead.length });
  }),
};
