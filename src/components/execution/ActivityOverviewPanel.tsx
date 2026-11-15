"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import {
  outcomeLabels,
  participationLabels,
  templateFieldGroups,
} from "@/lib/activityTemplates";
import {
  ACTIVITY_REPORTING_TEMPLATE_LABELS,
  type ID,
} from "@/types/domain";
import { useOsStore } from "@/store/store";
import { ImpactPanel } from "@/components/gantt/ImpactPanel";

function Collapsible({
  title,
  defaultOpen = true,
  children,
  testId,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card data-testid={testId}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted">
          {title}
        </CardTitle>
        <span className="text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ActivityOverviewPanel({
  programmeId,
  activityId,
}: {
  programmeId: ID;
  activityId: ID;
}) {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const activity = state.activities[activityId];
  const programme = state.programmes[programmeId];
  const detail = state.activityDetails[activityId];
  const hideInternal = role === "marcom";

  const locations = useMemo(
    () =>
      Object.values(state.activityLocations)
        .filter((l) => l.activityId === activityId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.activityLocations, activityId],
  );
  const sessions = useMemo(
    () =>
      Object.values(state.activitySessions)
        .filter((s) => s.activityId === activityId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.activitySessions, activityId],
  );
  const stakeholders = useMemo(
    () =>
      Object.values(state.activityStakeholders)
        .filter((s) => s.activityId === activityId)
        .filter((s) => (hideInternal ? s.marcomVisible : true))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.activityStakeholders, activityId, hideInternal],
  );
  const evidence = useMemo(
    () =>
      Object.values(state.evidence).filter(
        (e) =>
          e.activityId === activityId &&
          !e.deleted &&
          (hideInternal ? e.marcomApproved : true),
      ),
    [state.evidence, activityId, hideInternal],
  );

  if (!activity || !programme) return null;

  const template = activity.reportingTemplate ?? "generic";
  const groups = templateFieldGroups(template);
  const partLabels = participationLabels(template);
  const outLabels = outcomeLabels(template);
  const milestones = state.activityMilestones
    .filter((am) => am.activityId === activityId)
    .map((am) => state.milestones[am.milestoneId])
    .filter(Boolean);

  const support = activity.supportIds
    .map((id) => state.users[id]?.name)
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-3" data-testid="activity-overview-panel">
      {detail?.demoIllustrative ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted">
          Illustrative demo data — operational narrative for walkthroughs. Budget
          and expense figures remain the authoritative financial record.
        </p>
      ) : null}

      <Collapsible title="1 · Activity summary" testId="overview-summary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-muted">Activity</p>
            <p className="font-medium">
              {programme.code} · {activity.code} · {activity.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Parent programme</p>
            <p className="font-medium">{programme.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Category</p>
            <p className="font-medium">
              {state.categories[programme.categoryId]?.name ?? "—"}
              {activity.categoryId
                ? ` · ${state.activityCategories[activity.categoryId]?.name ?? ""}`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Owner</p>
            <p className="font-medium">
              {state.users[activity.ownerId]?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Support team</p>
            <p className="font-medium">{support.join(", ") || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Reporting template</p>
            <Badge tone="info">
              {ACTIVITY_REPORTING_TEMPLATE_LABELS[template]}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted">Planned</p>
            <p className="font-medium">
              {formatDate(activity.plannedStart)} →{" "}
              {formatDate(activity.plannedEnd)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Actual</p>
            <p className="font-medium">
              {activity.actualStart
                ? formatDate(activity.actualStart)
                : "—"}{" "}
              → {activity.actualEnd ? formatDate(activity.actualEnd) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Status / Priority</p>
            <p className="font-medium">
              {activity.status} · {activity.priority}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm">{activity.description || "No description."}</p>
        {activity.partnerOrganisations &&
        activity.partnerOrganisations.length > 0 ? (
          <p className="mt-2 text-xs text-muted">
            Partners: {activity.partnerOrganisations.join(" · ")}
          </p>
        ) : null}
      </Collapsible>

      <Collapsible title="2 · Objective and expected outputs">
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs text-muted">Objective</p>
            <p>{activity.objective || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Expected outputs</p>
            <p>{activity.expectedOutput || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Expected outcomes</p>
            <p>{activity.expectedOutcomes || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Milestones</p>
            <p>{milestones.map((m) => m!.name).join(", ") || "—"}</p>
          </div>
        </div>
      </Collapsible>

      {groups.includes("sessions") || groups.includes("locations") ? (
        <Collapsible title="3 · Implementation details">
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted">Delivery methodology</p>
              <p>{detail?.deliveryMethodology || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Activities undertaken</p>
              <p>{detail?.activitiesUndertaken || "—"}</p>
            </div>
          </div>
        </Collapsible>
      ) : null}

      {groups.includes("locations") ? (
        <Collapsible title="4 · Location and coverage" testId="overview-locations">
          <p className="mb-3 text-sm text-muted">
            {detail?.geographicCoverage || "No coverage summary."}
            {detail?.locationsCovered != null
              ? ` · ${detail.locationsCovered} locations`
              : ""}
          </p>
          {locations.length === 0 ? (
            <p className="text-sm text-muted">No location records.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Location</TH>
                  <TH>Sessions</TH>
                  <TH>Participants</TH>
                  <TH>Startups</TH>
                  <TH>Applications</TH>
                </TR>
              </THead>
              <TBody>
                {locations.map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <div className="font-medium">{l.city ?? l.fullLocation}</div>
                      <div className="text-xs text-muted">
                        {[l.district, l.state].filter(Boolean).join(", ")}
                      </div>
                    </TD>
                    <TD>{l.sessions ?? "—"}</TD>
                    <TD>{l.participants ?? "—"}</TD>
                    <TD>{l.startupsReached ?? "—"}</TD>
                    <TD>{l.applications ?? "—"}</TD>
                  </TR>
                ))}
                <TR>
                  <TD className="font-semibold">Total</TD>
                  <TD className="font-semibold">
                    {locations.reduce((s, l) => s + (l.sessions ?? 0), 0)}
                  </TD>
                  <TD className="font-semibold">
                    {locations.reduce((s, l) => s + (l.participants ?? 0), 0)}
                  </TD>
                  <TD className="font-semibold">
                    {locations.reduce((s, l) => s + (l.startupsReached ?? 0), 0)}
                  </TD>
                  <TD className="font-semibold">
                    {locations.reduce((s, l) => s + (l.applications ?? 0), 0)}
                  </TD>
                </TR>
              </TBody>
            </Table>
          )}
          {detail?.participatingInstitutions?.length ? (
            <p className="mt-3 text-xs text-muted">
              Institutions: {detail.participatingInstitutions.join(" · ")}
            </p>
          ) : null}
        </Collapsible>
      ) : null}

      {groups.includes("participation") ? (
        <Collapsible
          title="5 · Participation and engagement"
          testId="overview-participation"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {partLabels.map(({ key, label }) => {
              const value = detail?.participation?.[key];
              if (value == null) return null;
              return <Metric key={key} label={label} value={value} />;
            })}
          </div>
        </Collapsible>
      ) : null}

      {groups.includes("outcomes") ? (
        <Collapsible
          title="6 · Key outcomes and results"
          testId="overview-outcomes"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {outLabels.map(({ key, label }) => {
              const value = detail?.outcomes?.[key];
              if (typeof value !== "number") return null;
              return <Metric key={key} label={label} value={value} />;
            })}
          </div>
        </Collapsible>
      ) : null}

      <Collapsible title="7 · Stakeholders and partners" testId="overview-stakeholders">
        {stakeholders.length === 0 ? (
          <p className="text-sm text-muted">No stakeholder records.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Organisation</TH>
                <TH>Type</TH>
                <TH>Role</TH>
                <TH>Location</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {stakeholders.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <div className="font-medium">{s.organisationName}</div>
                    {s.contactPerson && !hideInternal ? (
                      <div className="text-xs text-muted">{s.contactPerson}</div>
                    ) : null}
                  </TD>
                  <TD>
                    <Badge tone="neutral">{s.organisationType}</Badge>
                  </TD>
                  <TD className="text-xs">{s.roleInActivity ?? "—"}</TD>
                  <TD className="text-xs">{s.location ?? "—"}</TD>
                  <TD>
                    <Badge tone="success">
                      {s.engagementStatus ?? "—"}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Collapsible>

      {groups.includes("qualitative") ? (
        <Collapsible
          title="8 · Key achievements and learnings"
          testId="overview-qualitative"
        >
          <div className="grid gap-4 lg:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted">
                Key achievements
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(detail?.qualitative.keyAchievements ?? []).map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {!detail?.qualitative.keyAchievements?.length ? (
                  <li className="text-muted">—</li>
                ) : null}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">
                Important learnings
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(detail?.qualitative.importantLearnings ?? []).map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {!detail?.qualitative.importantLearnings?.length ? (
                  <li className="text-muted">—</li>
                ) : null}
              </ul>
            </div>
            {!hideInternal ? (
              <div>
                <p className="text-xs font-medium uppercase text-muted">
                  Challenges
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {(detail?.qualitative.challenges ?? []).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  {!detail?.qualitative.challenges?.length ? (
                    <li className="text-muted">—</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium uppercase text-muted">
                Recommendations
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(detail?.qualitative.recommendations ?? []).map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {!detail?.qualitative.recommendations?.length ? (
                  <li className="text-muted">—</li>
                ) : null}
              </ul>
            </div>
          </div>
        </Collapsible>
      ) : null}

      <Collapsible title="9 · Upcoming follow-up actions">
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {(detail?.qualitative.followUpActions ?? []).map((line) => (
            <li key={line}>{line}</li>
          ))}
          {detail?.qualitative.nextSteps ? (
            <li>
              <span className="font-medium">Next steps: </span>
              {detail.qualitative.nextSteps}
            </li>
          ) : null}
          {!detail?.qualitative.followUpActions?.length &&
          !detail?.qualitative.nextSteps ? (
            <li className="text-muted">No follow-up actions recorded.</li>
          ) : null}
        </ul>
      </Collapsible>

      {groups.includes("sessions") ? (
        <Collapsible title="Session-wise records" testId="overview-sessions" defaultOpen>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted">No session records.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Session</TH>
                  <TH>Date</TH>
                  <TH>Location</TH>
                  <TH>Participants</TH>
                  <TH>Startups</TH>
                </TR>
              </THead>
              <TBody>
                {sessions.map((s) => (
                  <TR key={s.id}>
                    <TD className="text-xs text-muted">{s.sortOrder}</TD>
                    <TD>
                      <div className="font-medium">{s.name}</div>
                      {s.topic ? (
                        <div className="text-xs text-muted">{s.topic}</div>
                      ) : null}
                    </TD>
                    <TD className="text-xs">{formatDate(s.date)}</TD>
                    <TD className="text-xs">
                      {s.location}
                      {s.venue ? ` · ${s.venue}` : ""}
                    </TD>
                    <TD>{s.participants ?? "—"}</TD>
                    <TD>{s.startupsRepresented ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Collapsible>
      ) : null}

      <Collapsible title="10 · Evidence and supporting documents">
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">
            No evidence on file for this activity
            {hideInternal ? " (approved items only)." : "."}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {evidence.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{e.fileName}</p>
                  <p className="text-xs text-muted">
                    {e.type}
                    {e.description ? ` · ${e.description}` : ""}
                    {e.sessionId
                      ? ` · session ${state.activitySessions[e.sessionId]?.name ?? e.sessionId}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  {e.marcomApproved ? (
                    <Badge tone="success">MarCom</Badge>
                  ) : null}
                  {e.clientApproved ? (
                    <Badge tone="info">Client</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <CardHeader className="px-0 pb-0">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted">
          Dependency impact
        </CardTitle>
      </CardHeader>
      <ImpactPanel sourceActivityId={activityId} />
    </div>
  );
}
