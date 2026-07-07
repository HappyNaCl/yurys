import type { Metadata } from "next";
import FinanceView from "../_components/finance/FinanceView";

export const metadata: Metadata = {
  title: "Finance — YuRyS",
};

export default function FinancePage() {
  return <FinanceView />;
}
