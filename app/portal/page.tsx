import type { Metadata } from "next";

import { PortalEntry } from "@/components/portal-entry";

export const metadata: Metadata = {
  title: "Choice Filling Workspace | VidyaSaarthi",
  description: "Create, review, save and lock student-wise counselling preference lists.",
};

export default function PortalPage() {
  return <PortalEntry />;
}
