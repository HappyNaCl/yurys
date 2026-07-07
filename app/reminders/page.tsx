import type { Metadata } from "next";
import RemindersView from "../_components/reminders/RemindersView";

export const metadata: Metadata = {
  title: "Reminders — YuRyS",
};

export default function RemindersPage() {
  return <RemindersView />;
}
