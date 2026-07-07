import type { Metadata } from "next";
import TagsView from "../_components/tags/TagsView";

export const metadata: Metadata = {
  title: "Tags — YuRyS",
};

export default function TagsPage() {
  return <TagsView />;
}
