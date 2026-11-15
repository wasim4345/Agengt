import type {
  ActivityDetail,
  ActivityLocation,
  ActivitySession,
  ActivityStakeholder,
  AppState,
  Evidence,
} from "@/types/domain";
import { IDS } from "./ids";

const ACTIVITY_ID = "act_p5_a01";
const PROGRAMME_ID = IDS.programmes.p5;

/** Illustrative Outreach (IIMCIP-CHAL-2025-005 · A01) pack — financials unchanged. */
export function applyOutreachDemoPack(pack: AppState): void {
  const activity = pack.activities[ACTIVITY_ID];
  if (!activity) return;

  activity.plannedStart = "2026-04-26";
  activity.plannedEnd = "2026-06-15";
  activity.baselineStart = "2026-04-26";
  activity.baselineEnd = "2026-06-15";
  activity.actualStart = "2026-04-26";
  activity.actualEnd = "2026-06-15";
  activity.ownerId = IDS.users.rohit;
  activity.status = "completed";
  activity.percentComplete = 100;
  activity.reportingTemplate = "outreach";
  activity.objective =
    "Build regional awareness of the Idea Hunt programme and generate qualified applications from Jharkhand startup communities.";
  activity.expectedOutcomes =
    "Reach founders across four cities, generate programme applications, and establish institutional and ecosystem partnerships for future cycles.";
  activity.expectedOutput =
    "Eight outreach sessions completed with location-wise participation and application tracking.";
  activity.description =
    "Multi-city outreach across Jharkhand covering awareness sessions, founder orientation, and institutional engagement. Illustrative demo data.";
  activity.partnerOrganisations = [
    "Demo Ranchi Engineering College",
    "Demo Jamshedpur Incubation Cell",
    "Demo Dhanbad Startup Forum",
    "Demo Bokaro Industry Association",
  ];

  const detail: ActivityDetail = {
    activityId: ACTIVITY_ID,
    programmeId: PROGRAMME_ID,
    geographicCoverage: "Jharkhand, India — Ranchi, Jamshedpur, Dhanbad, Bokaro",
    locationsCovered: 4,
    participatingInstitutions: [
      "Demo Ranchi Engineering College",
      "Demo Jamshedpur Incubation Cell",
      "Demo Dhanbad Polytechnic",
      "Demo Bokaro Community Centre",
    ],
    deliveryMethodology:
      "In-person awareness workshops with partner institutions, founder orientation clinics, and ecosystem partner co-branded sessions.",
    activitiesUndertaken:
      "Ecosystem awareness sessions, founder outreach and programme orientation, institutional outreach, and ecosystem awareness workshops.",
    participation: {
      outreachSessions: 8,
      totalParticipants: 342,
      startupsReached: 126,
      partnerOrganisations: 18,
      speakersExperts: 10,
      institutionalRepresentatives: 28,
      founders: 96,
      students: 140,
    },
    outcomes: {
      applicationsGenerated: 48,
      institutionalPartnersEngaged: 12,
      ecosystemPartnersEngaged: 6,
      partnershipsGenerated: 6,
      leadsGenerated: 48,
    },
    qualitative: {
      keyAchievements: [
        "Reached 126 startups across four locations.",
        "Generated 48 programme applications.",
        "Engaged 12 institutional partners.",
        "Established six ecosystem partnerships for future outreach.",
        "Increased programme awareness among regional startup communities.",
      ],
      challenges: [
        "Limited awareness of formal startup support programmes in some locations.",
        "Difficulty coordinating outreach across multiple institutions.",
        "Need for additional follow-up with early-stage founders.",
      ],
      recommendations: [
        "Conduct targeted follow-up with the 48 applicants.",
        "Develop institutional outreach partnerships for future programme cycles.",
        "Maintain a regional startup database.",
        "Organise focused orientation sessions for prospective applicants.",
      ],
      followUpActions: [
        "Schedule applicant orientation webinars in July 2026.",
        "Share shortlisted institutional MOU drafts with Programme Lead.",
        "Update regional startup contact list in Data Manager.",
      ],
      importantLearnings: [
        "Partner-hosted venues improved attendance versus standalone events.",
        "Founder clinics converted awareness into applications more effectively than plenary sessions alone.",
      ],
      nextSteps:
        "Hand shortlisted applicants to the Shortlisting activity and brief MarCom on approved outreach highlights.",
      internalRemarks:
        "INTERNAL: verification of participant counts completed by Programme Manager — not for MarCom release.",
    },
    demoIllustrative: true,
  };
  pack.activityDetails[ACTIVITY_ID] = detail;

  const locations: ActivityLocation[] = [
    {
      id: "aloc_p5_ranchi",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      state: "Jharkhand",
      district: "Ranchi",
      city: "Ranchi",
      venue: "Multiple institutional venues",
      fullLocation: "Ranchi, Jharkhand, India",
      sessions: 3,
      participants: 138,
      startupsReached: 48,
      applications: 19,
      sortOrder: 1,
    },
    {
      id: "aloc_p5_jsr",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      state: "Jharkhand",
      district: "East Singhbhum",
      city: "Jamshedpur",
      venue: "Demo Jamshedpur Incubation Cell",
      fullLocation: "Jamshedpur, Jharkhand, India",
      sessions: 2,
      participants: 84,
      startupsReached: 31,
      applications: 12,
      sortOrder: 2,
    },
    {
      id: "aloc_p5_dhanbad",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      state: "Jharkhand",
      district: "Dhanbad",
      city: "Dhanbad",
      venue: "Demo Dhanbad Polytechnic",
      fullLocation: "Dhanbad, Jharkhand, India",
      sessions: 2,
      participants: 76,
      startupsReached: 29,
      applications: 10,
      sortOrder: 3,
    },
    {
      id: "aloc_p5_bokaro",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      state: "Jharkhand",
      district: "Bokaro",
      city: "Bokaro",
      venue: "Demo Bokaro Community Centre",
      fullLocation: "Bokaro, Jharkhand, India",
      sessions: 1,
      participants: 44,
      startupsReached: 18,
      applications: 7,
      sortOrder: 4,
    },
  ];
  for (const loc of locations) pack.activityLocations[loc.id] = loc;

  const sessions: Omit<ActivitySession, "programmeId" | "activityId">[] = [
    {
      id: "ases_p5_01",
      name: "Startup Ecosystem Awareness Session",
      date: "2026-04-26",
      location: "Ranchi",
      venue: "Demo Ranchi Engineering College",
      topic: "Startup ecosystem overview and Idea Hunt brief",
      facilitator: "Demo Manager Ranchi",
      participants: 52,
      startupsRepresented: 18,
      keyDiscussions: "Programme eligibility, application timeline, mentoring support.",
      outcomes: "Strong interest from student founders; 8 draft applications started.",
      sortOrder: 1,
    },
    {
      id: "ases_p5_02",
      name: "Founder Outreach and Programme Orientation",
      date: "2026-05-10",
      location: "Ranchi",
      venue: "Demo Ranchi Startup Hub",
      topic: "Founder orientation and application walkthrough",
      facilitator: "Demo Lead HQ (guest)",
      participants: 46,
      startupsRepresented: 16,
      keyDiscussions: "Application quality, evidence of traction, support offered.",
      outcomes: "6 complete applications submitted on the day.",
      sortOrder: 2,
    },
    {
      id: "ases_p5_03",
      name: "Institutional Outreach",
      date: "2026-05-18",
      location: "Ranchi",
      venue: "Demo District Industry Centre",
      topic: "Institutional partnership for outreach pipelines",
      facilitator: "Demo Manager Ranchi",
      participants: 40,
      startupsRepresented: 14,
      keyDiscussions: "MOU templates, campus ambassador model.",
      outcomes: "3 institutional partners confirmed for next cycle.",
      sortOrder: 3,
    },
    {
      id: "ases_p5_04",
      name: "Startup Awareness Session",
      date: "2026-05-25",
      location: "Jamshedpur",
      venue: "Demo Jamshedpur Incubation Cell",
      topic: "Awareness for industrial-city founders",
      facilitator: "Demo ecosystem partner",
      participants: 44,
      startupsRepresented: 17,
      keyDiscussions: "Hardware vs software tracks; regional resources.",
      outcomes: "12 applications initiated.",
      sortOrder: 4,
    },
    {
      id: "ases_p5_05",
      name: "Founder Engagement Session",
      date: "2026-05-30",
      location: "Jamshedpur",
      venue: "Demo Jamshedpur Incubation Cell",
      topic: "Deep-dive clinic for shortlisted prospects",
      facilitator: "Demo Manager Ranchi",
      participants: 40,
      startupsRepresented: 14,
      keyDiscussions: "Pitch readiness and mentoring expectations.",
      outcomes: "Follow-up list of 10 high-potential founders.",
      sortOrder: 5,
    },
    {
      id: "ases_p5_06",
      name: "Startup Outreach Workshop",
      date: "2026-06-05",
      location: "Dhanbad",
      venue: "Demo Dhanbad Polytechnic",
      topic: "Workshop for early-stage founders",
      facilitator: "Demo speaker panel",
      participants: 39,
      startupsRepresented: 15,
      keyDiscussions: "Formalising ventures; accessing support schemes.",
      outcomes: "10 applications generated from the workshop.",
      sortOrder: 6,
    },
    {
      id: "ases_p5_07",
      name: "Institutional Engagement",
      date: "2026-06-10",
      location: "Dhanbad",
      venue: "Demo Dhanbad Polytechnic",
      topic: "Faculty and incubation cell engagement",
      facilitator: "Demo Manager Ranchi",
      participants: 37,
      startupsRepresented: 14,
      keyDiscussions: "Campus pipeline and joint outreach calendar.",
      outcomes: "2 ecosystem partnerships agreed in principle.",
      sortOrder: 7,
    },
    {
      id: "ases_p5_08",
      name: "Ecosystem Awareness Session",
      date: "2026-06-15",
      location: "Bokaro",
      venue: "Demo Bokaro Community Centre",
      topic: "Closing awareness session for Bokaro founders",
      facilitator: "Demo Manager Ranchi",
      participants: 44,
      startupsRepresented: 18,
      keyDiscussions: "Application deadline and support channels.",
      outcomes: "7 applications; Bokaro partner list updated.",
      sortOrder: 8,
    },
  ];
  for (const s of sessions) {
    pack.activitySessions[s.id] = {
      ...s,
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
    };
  }

  const stakeholders: ActivityStakeholder[] = [
    {
      id: "astk_p5_01",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      organisationName: "Demo Ranchi Engineering College",
      organisationType: "academic",
      contactPerson: "Demo campus coordinator",
      roleInActivity: "Host venue · participant pipeline",
      contribution: "Venue + student founder mobilisation",
      location: "Ranchi",
      engagementStatus: "completed",
      marcomVisible: true,
      sortOrder: 1,
    },
    {
      id: "astk_p5_02",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      organisationName: "Demo Jamshedpur Incubation Cell",
      organisationType: "ecosystem",
      contactPerson: "Demo incubation lead",
      roleInActivity: "Co-host · outreach partner",
      contribution: "Session co-branding and founder invites",
      location: "Jamshedpur",
      engagementStatus: "completed",
      marcomVisible: true,
      sortOrder: 2,
    },
    {
      id: "astk_p5_03",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      organisationName: "Demo District Industry Centre",
      organisationType: "government",
      contactPerson: "Demo DIC officer",
      roleInActivity: "Institutional outreach partner",
      contribution: "Introductions to local industry associations",
      location: "Ranchi",
      engagementStatus: "completed",
      marcomVisible: false,
      sortOrder: 3,
    },
    {
      id: "astk_p5_04",
      activityId: ACTIVITY_ID,
      programmeId: PROGRAMME_ID,
      organisationName: "Demo Bokaro Industry Association",
      organisationType: "industry",
      roleInActivity: "Ecosystem partner",
      contribution: "Local founder network access",
      location: "Bokaro",
      engagementStatus: "completed",
      marcomVisible: true,
      sortOrder: 4,
    },
  ];
  for (const s of stakeholders) pack.activityStakeholders[s.id] = s;

  // Lightweight meta evidence rows (no blobs) — illustrative
  const evidenceMeta: Evidence[] = [
    {
      id: "ev_p5_a01_att",
      programmeId: PROGRAMME_ID,
      activityId: ACTIVITY_ID,
      sessionId: "ases_p5_01",
      type: "attendance_sheet",
      fileName: "attendance-ranchi-2026-04-26.pdf",
      mime: "application/pdf",
      size: 48_000,
      description: "Attendance sheet — Ranchi awareness session",
      caption: "Illustrative demo file metadata",
      uploadedBy: IDS.users.rohit,
      uploadedAt: "2026-04-26T16:00:00.000Z",
      clientApproved: false,
      marcomApproved: true,
    },
    {
      id: "ev_p5_a01_list",
      programmeId: PROGRAMME_ID,
      activityId: ACTIVITY_ID,
      type: "participant_list",
      fileName: "participants-jharkhand-outreach.csv",
      mime: "text/csv",
      size: 12_000,
      description: "Consolidated participant list (demo)",
      uploadedBy: IDS.users.rohit,
      uploadedAt: "2026-06-16T10:00:00.000Z",
      clientApproved: false,
      marcomApproved: false,
    },
    {
      id: "ev_p5_a01_deck",
      programmeId: PROGRAMME_ID,
      activityId: ACTIVITY_ID,
      sessionId: "ases_p5_02",
      type: "presentation",
      fileName: "idea-hunt-orientation-deck.pdf",
      mime: "application/pdf",
      size: 920_000,
      description: "Orientation presentation used across sessions",
      uploadedBy: IDS.users.rohit,
      uploadedAt: "2026-05-10T12:00:00.000Z",
      clientApproved: true,
      marcomApproved: true,
    },
  ];
  for (const e of evidenceMeta) pack.evidence[e.id] = e;
}
