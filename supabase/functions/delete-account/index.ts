// Permanently deletes the caller's account and data.
// Circles they own are handed to the next member (via the on_member_left trigger) instead of
// being deleted for everyone; their voice notes are removed from storage.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const uid = ctx.userClaims?.id;
    if (!uid) return Response.json({ error: "Not signed in" }, { status: 401 });
    const admin = ctx.supabaseAdmin;

    // 1. Leave every circle one by one so ownership passes on (empty circles are removed).
    const { data: memberships, error: mErr } = await admin.from("circle_members").select("circle_id").eq("user_id", uid);
    if (mErr) return Response.json({ error: mErr.message }, { status: 500 });
    for (const { circle_id } of memberships ?? []) {
      const { error } = await admin.from("circle_members").delete().eq("circle_id", circle_id).eq("user_id", uid);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    // 2. Voice notes they sent.
    const bucket = admin.storage.from("voice-notes");
    for (;;) {
      const { data: files, error } = await bucket.list(uid, { limit: 100 });
      if (error || !files?.length) break;
      const { error: rmErr } = await bucket.remove(files.map((f) => `${uid}/${f.name}`));
      if (rmErr) break;
    }

    // 3. The account itself; everything else cascades from profiles.
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ deleted: true });
  }),
};
