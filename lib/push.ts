"use client";

import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// VAPID public keys are URL-safe base64; PushManager wants raw bytes.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// Stable doc id from the endpoint so re-subscribing the same browser overwrites
// its record instead of piling up duplicates.
function endpointKey(endpoint: string) {
  let hash = 5381;
  for (let i = 0; i < endpoint.length; i++) {
    hash = (hash * 33) ^ endpoint.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function subscriptionDoc(uid: string, endpoint: string) {
  return doc(getDb(), "users", uid, "pushSubscriptions", endpointKey(endpoint));
}

// Ask permission, subscribe this browser to push, and store the subscription
// so the dispatch endpoint can reach it.
export async function enablePush(uid: string) {
  if (!pushSupported()) {
    throw new Error("Push notifications aren't supported on this device.");
  }
  if (!PUBLIC_KEY) {
    throw new Error("Missing VAPID public key — set NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  sub ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
  });

  const json = sub.toJSON();
  await setDoc(subscriptionDoc(uid, sub.endpoint), {
    endpoint: json.endpoint,
    keys: json.keys,
    createdAt: serverTimestamp(),
  });
}

// Unsubscribe this browser and drop its stored record.
export async function disablePush(uid: string) {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  await deleteDoc(subscriptionDoc(uid, sub.endpoint));
  await sub.unsubscribe();
}

// Is this browser currently subscribed with permission granted?
export async function pushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) !== null;
}
