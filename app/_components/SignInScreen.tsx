"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import Icon from "./Icon";

const inputClasses =
  "w-full rounded-[13px] border-[1.5px] border-line bg-panel px-[15px] py-[13px] text-[15px] font-semibold text-ink outline-none transition-[border-color,background,box-shadow] placeholder:text-faint focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(220,43,84,0.12)]";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const auth = getFirebaseAuth();
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setNotice({ kind: "error", text: "Invalid email or password." });
      setBusy(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      setNotice({ kind: "info", text: "Enter your email first." });
      return;
    }
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setNotice({ kind: "info", text: "Password reset email sent." });
    } catch {
      setNotice({ kind: "error", text: "Couldn't send the reset email." });
    }
  }

  return (
    <main className="theme-light flex min-h-dvh flex-1 items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#f7eef2,#efe4ea)] p-4 sm:p-8">
      <div className="grid w-full max-w-[960px] overflow-hidden rounded-[28px] border border-line-soft bg-white shadow-[0_40px_90px_-40px_rgba(43,30,44,0.45)] md:grid-cols-[1.05fr_1fr]">
        {/* Art panel */}
        <div className="relative flex min-h-[240px] flex-col overflow-hidden bg-[linear-gradient(160deg,#dc2b54_0%,#a62a6e_48%,#3a2340_100%)] md:min-h-[560px]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(43,30,44,0.05)_0%,rgba(43,30,44,0.55)_100%)]" />
          <div className="pointer-events-none absolute -right-[30px] top-11 h-[120px] w-[120px] rotate-30 animate-[float-dot_7s_ease-in-out_infinite] rounded-[40px] bg-white/12" />
          <div className="pointer-events-none absolute -left-6 bottom-[140px] h-20 w-20 animate-[float-dot_5.5s_ease-in-out_infinite] rounded-full bg-plum/35" />

          <div className="pointer-events-none relative z-[2] flex items-center gap-[11px] p-6 md:p-10">
            <img
              src="/favicon.svg"
              alt=""
              width={40}
              height={40}
              className="rounded-[13px]"
            />
            <span className="font-display text-[21px] font-bold text-white">
              YuRyS
            </span>
          </div>

          <div className="pointer-events-none relative z-[2] mt-auto p-6 md:p-10">
            <h2 className="m-0 mb-2.5 text-balance font-display text-2xl font-semibold leading-[1.15] text-white md:text-[30px]">
              Bring your ideas into motion.
            </h2>
            <p className="m-0 text-[15px] font-semibold leading-normal text-white/82">
              Plan, track and ship — all on one board that feels like play.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-8 md:px-[52px] md:py-14">
          <span className="text-[13.5px] font-bold uppercase tracking-[0.04em] text-primary">
            Welcome back
          </span>
          <h1 className="mb-1.5 mt-2 font-display text-[30px] font-semibold text-ink">
            Sign in
          </h1>
          <p className="mb-[30px] text-[14.5px] font-semibold text-muted">
            Sign in to continue to your board.
          </p>

          <form onSubmit={handleSignIn} className="flex flex-col gap-[18px]">
            <label className="flex flex-col gap-[7px]">
              <span className="text-[13.5px] font-extrabold text-ink-soft">
                Email
              </span>
              <input
                type="email"
                required
                placeholder="you@studio.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-[7px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] font-extrabold text-ink-soft">
                  Password
                </span>
              </div>
              <div className="relative flex">
                <input
                  type={show ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClasses} pr-[46px]`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-[9px] text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary">
                  <Icon
                    name={show ? "visibility_off" : "visibility"}
                    size={20}
                  />
                </button>
              </div>
            </label>

            <label className="flex cursor-pointer select-none items-center gap-[9px]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-[18px] w-[18px] cursor-pointer accent-primary"
              />
              <span className="text-[13.5px] font-bold text-ink-soft">
                Keep me signed in
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-[13px] bg-primary p-3.5 font-display text-base font-semibold text-white shadow-[0_12px_26px_-12px_rgba(220,43,84,0.75)] transition-colors hover:bg-primary-deep active:translate-y-px disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>

            {notice && (
              <p
                role="alert"
                className={`text-center text-sm font-bold ${
                  notice.kind === "error" ? "text-primary" : "text-ink-soft"
                }`}>
                {notice.text}
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
