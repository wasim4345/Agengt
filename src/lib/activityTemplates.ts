import type { ActivityReportingTemplate } from "@/types/domain";

export type TemplateFieldGroup =
  | "participation"
  | "outcomes"
  | "locations"
  | "sessions"
  | "qualitative";

/** Which Overview / Update field groups a reporting template emphasises. */
export function templateFieldGroups(
  template: ActivityReportingTemplate | undefined,
): TemplateFieldGroup[] {
  switch (template) {
    case "outreach":
      return ["locations", "sessions", "participation", "outcomes", "qualitative"];
    case "startup_evaluation":
      return ["participation", "outcomes", "qualitative"];
    case "bootcamp":
      return ["sessions", "participation", "outcomes", "qualitative"];
    case "mentoring":
      return ["sessions", "participation", "outcomes", "qualitative"];
    case "investor_connect":
      return ["participation", "outcomes", "qualitative"];
    case "demo_day":
      return ["sessions", "participation", "outcomes", "qualitative"];
    case "programme_closure":
      return ["outcomes", "qualitative"];
    case "generic":
    default:
      return ["participation", "outcomes", "qualitative"];
  }
}

export function participationLabels(
  template: ActivityReportingTemplate | undefined,
): { key: keyof import("@/types/domain").ActivityParticipation; label: string }[] {
  const common = [
    { key: "totalParticipants" as const, label: "Total participants" },
    { key: "startupsReached" as const, label: "Startups reached" },
    { key: "speakersExperts" as const, label: "Speakers / experts" },
    { key: "partnerOrganisations" as const, label: "Partner organisations" },
  ];
  if (template === "outreach") {
    return [
      { key: "outreachSessions", label: "Outreach sessions" },
      ...common,
      { key: "founders", label: "Founders" },
      { key: "students", label: "Students" },
      {
        key: "institutionalRepresentatives",
        label: "Institutional representatives",
      },
    ];
  }
  if (template === "mentoring") {
    return [
      { key: "mentors", label: "Mentors involved" },
      { key: "startupsReached", label: "Startups mentored" },
      { key: "totalParticipants", label: "Session participants" },
    ];
  }
  if (template === "investor_connect" || template === "demo_day") {
    return [
      { key: "investors", label: "Investors engaged" },
      { key: "startupsReached", label: "Startups participating" },
      { key: "totalParticipants", label: "Total attendees" },
      { key: "speakersExperts", label: "Speakers / experts" },
    ];
  }
  return common;
}

export function outcomeLabels(
  template: ActivityReportingTemplate | undefined,
): { key: keyof import("@/types/domain").ActivityOutcomes; label: string }[] {
  if (template === "outreach") {
    return [
      { key: "applicationsGenerated", label: "Applications generated" },
      {
        key: "institutionalPartnersEngaged",
        label: "Institutional partners engaged",
      },
      {
        key: "ecosystemPartnersEngaged",
        label: "Ecosystem partners engaged",
      },
      { key: "partnershipsGenerated", label: "Partnerships generated" },
      { key: "leadsGenerated", label: "Leads generated" },
    ];
  }
  if (template === "startup_evaluation") {
    return [
      { key: "applicationsGenerated", label: "Applications received" },
      { key: "startupsShortlisted", label: "Startups shortlisted" },
      { key: "startupsOnboarded", label: "Startups onboarded" },
    ];
  }
  if (template === "investor_connect" || template === "demo_day") {
    return [
      {
        key: "startupsConnectedToInvestors",
        label: "Startups connected to investors",
      },
      { key: "expressionsOfInterest", label: "Expressions of interest" },
      {
        key: "startupsReceivingFunding",
        label: "Startups receiving funding",
      },
      { key: "partnershipsGenerated", label: "Partnership opportunities" },
    ];
  }
  if (template === "mentoring") {
    return [
      { key: "startupsMentored", label: "Startups mentored" },
      { key: "leadsGenerated", label: "Follow-ups logged" },
    ];
  }
  return [
    { key: "applicationsGenerated", label: "Applications generated" },
    { key: "startupsShortlisted", label: "Startups shortlisted" },
    { key: "partnershipsGenerated", label: "Partnerships generated" },
  ];
}
