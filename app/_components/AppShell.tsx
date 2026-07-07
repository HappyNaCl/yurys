"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import SignInScreen from "./SignInScreen";
import Sidebar from "./Sidebar";
import { UserContext } from "./UserContext";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      </main>
    );
  }

  if (!user) return <SignInScreen />;

  return (
    <UserContext.Provider value={user}>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </UserContext.Provider>
  );
}
