"use client";

import { RoleGate } from "@/components/RoleGate";
import { InstitutionalIntelligenceView } from "@/components/intelligence/InstitutionalIntelligenceView";

export default function InstitutionalIntelligencePage() {
  return (
    <RoleGate allow={["leadership"]}>
      <InstitutionalIntelligenceView />
    </RoleGate>
  );
}
