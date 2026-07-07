import { Timestamp } from "firebase-admin/firestore";
import webpush from "web-push";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { nextOccurrence, type Recurrence } from "@/lib/reminders";

// web-push needs Node crypto, and the endpoint must run fresh on every request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured.");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
}

// Cron worker hits this once a minute. It finds reminders whose time has come,
// pushes a notification to each of the owner's browsers, then either advances
// the reminder (recurring) or marks it fired (one-time).
async function dispatch() {
  configureWebPush();
  const db = getAdminDb();
  const now = new Date();

  // Single-field range query — no composite index needed. Fired one-time
  // reminders still match here (their time is in the past), so we skip them
  // in code below rather than in the query.
  const dueSnap = await db
    .collectionGroup("reminders")
    .where("remindAt", "<=", Timestamp.fromDate(now))
    .get();

  const due = dueSnap.docs.filter((d) => d.data().fired !== true);

  // Group by owner so each user's subscriptions are loaded once.
  const byUser = new Map<string, typeof due>();
  for (const docSnap of due) {
    const uid = docSnap.ref.parent.parent?.id;
    if (!uid) continue;
    const list = byUser.get(uid);
    if (list) list.push(docSnap);
    else byUser.set(uid, [docSnap]);
  }

  let processed = 0;
  let sent = 0;

  for (const [uid, docs] of byUser) {
    const subsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("pushSubscriptions")
      .get();
    const subs = subsSnap.docs.map((s) => ({
      id: s.id,
      ...(s.data() as StoredSubscription),
    }));

    for (const docSnap of docs) {
      processed++;
      const data = docSnap.data();
      const payload = JSON.stringify({
        title: data.title || "Reminder",
        body: data.description || "",
        url: "/reminders",
      });

      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload,
            );
            sent++;
          } catch (err) {
            // 404/410 mean the subscription is dead — prune it.
            const code = (err as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) {
              await subsSnap.docs
                .find((d) => d.id === sub.id)
                ?.ref.delete();
            }
          }
        }),
      );

      const recurrence = (data.recurrence as Recurrence) ?? "once";
      if (recurrence === "once") {
        await docSnap.ref.update({ fired: true });
      } else {
        const next = nextOccurrence(data.remindAt.toDate(), recurrence, now);
        await docSnap.ref.update({ remindAt: Timestamp.fromDate(next) });
      }
    }
  }

  return { ok: true, processed, sent };
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await dispatch());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dispatch failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
