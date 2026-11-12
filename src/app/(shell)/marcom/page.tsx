"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useOsStore } from "@/store/store";

export default function MarcomHomePage() {
  const state = useOsStore((s) => s.state);
  const events = Object.values(state.activities).filter(
    (a) =>
      a.categoryId === "acat_events" ||
      a.categoryId === "acat_networking",
  );
  const achievements = Object.values(state.achievements).filter(
    (a) => a.marcomApproved,
  );
  const photos = Object.values(state.evidence).filter(
    (e) => e.type === "photograph" && e.marcomApproved && !e.deleted,
  );

  return (
    <RoleGate allow={["marcom"]}>
      <PageHeader
        title="MarCom dashboard"
        description="Approved media, events, and startup wins only."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming / recent events</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex justify-between gap-2 text-sm">
                <span>{e.name}</span>
                <Badge tone="neutral">{e.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approved achievements</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {achievements.map((a) => (
              <p key={a.id} className="text-sm">
                {a.title}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approved photos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">{photos.length} assets</p>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
