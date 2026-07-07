"use client";

import type { User } from "firebase/auth";
import { createContext, useContext } from "react";

export const UserContext = createContext<User | null>(null);

export function useUser(): User {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside a signed-in shell");
  return user;
}
