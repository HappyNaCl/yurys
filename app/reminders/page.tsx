import type { Metadata } from "next";
import ComingSoon from "../_components/ComingSoon";
import Icon from "../_components/Icon";

export const metadata: Metadata = {
  title: "Reminders — YuRyS",
};

export default function RemindersPage() {
  return (
    <ComingSoon
      title="Reminders"
      description="Nudges for the things you'd otherwise forget — this section isn't built yet."
      icon={<Icon name="notifications" size={30} />}
    />
  );
}
