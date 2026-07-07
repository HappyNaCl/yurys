"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  applyTheme,
  currentTheme,
  subscribeTheme,
  type Theme,
} from "@/lib/theme";
import Icon from "./Icon";
import { useUser } from "./UserContext";

const NAV = [
  { href: "/", label: "Todo", icon: "view_kanban" },
  { href: "/reminders", label: "Reminders", icon: "notifications" },
  { href: "/finance", label: "Finance", icon: "account_balance_wallet" },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-[linear-gradient(150deg,#dc2b54,#7c5cbf)] shadow-[0_6px_16px_-6px_rgba(220,43,84,0.55)]">
        <div className="h-[15px] w-[15px] rotate-45 rounded-[5px] bg-white" />
      </div>
      <div className="flex flex-col leading-[1.1]">
        <span className="font-display text-[19px] font-bold text-ink">
          YuRyS
        </span>
        <span className="text-xs font-semibold text-muted">Personal hub</span>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-bold transition-colors ${
              active
                ? "border-[1.5px] border-line bg-card text-ink shadow-[0_2px_6px_-3px_rgba(43,30,44,0.12)]"
                : "border-[1.5px] border-transparent text-muted hover:bg-card/60 hover:text-ink-soft"
            }`}
          >
            <Icon
              name={item.icon}
              size={21}
              className={active ? "text-primary" : ""}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    currentTheme,
    () => "light",
  );

  function toggle() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-soft transition-colors hover:bg-chip hover:text-ink-soft"
    >
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={18} />
    </button>
  );
}

function UserFooter() {
  const user = useUser();
  return (
    <div className="flex items-center gap-1.5 border-t border-line pt-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chip text-[13px] font-extrabold uppercase text-muted">
        {(user.email ?? "?").charAt(0)}
      </span>
      <span className="ml-1 min-w-0 flex-1 truncate text-[13px] font-bold text-ink-soft">
        {user.email}
      </span>
      <button
        onClick={() => signOut(getFirebaseAuth())}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary"
      >
        <Icon name="logout" size={18} />
      </button>
      <ThemeToggle />
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 border-r border-line bg-card/60 p-5 md:flex">
        <Logo />
        <NavList />
        <div className="mt-auto">
          <UserFooter />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-card/72 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-lg md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors active:bg-chip"
        >
          <Icon name="menu" size={24} />
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-7 bg-card p-5 pt-[calc(env(safe-area-inset-top)+20px)] shadow-[0_0_60px_-12px_rgba(43,30,44,0.4)] transition-transform md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-soft transition-colors active:bg-chip"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <NavList onNavigate={() => setOpen(false)} />
        <div className="mt-auto pb-[env(safe-area-inset-bottom)]">
          <UserFooter />
        </div>
      </div>
    </>
  );
}
