export type OfficialScheduleEvent = {
  id: string;
  round: string;
  title: string;
  startAt: string;
  endAt: string;
  dateLabel: string;
  note?: string;
  tentative?: boolean;
  alertEligible?: boolean;
  scope?: "authority" | "national_coordination";
};

export type OfficialScheduleSource = {
  label: string;
  url: string;
};

export type OfficialCounsellingSchedule = {
  id: string;
  shortName: string;
  name: string;
  authority: string;
  notice: string;
  kind: "national" | "state" | "union_territory";
  region: string;
  coverage: "verified_full" | "coordination_window";
  sources: OfficialScheduleSource[];
  events: OfficialScheduleEvent[];
};

export type ScheduleEventState = "completed" | "ongoing" | "upcoming";

export const OFFICIAL_SCHEDULE_VERIFIED_AT = "2026-09-08T09:44:57+05:30";

const VERIFIED_COUNSELLING_SCHEDULES: OfficialCounsellingSchedule[] = [
  {
    id: "mcc",
    shortName: "MCC",
    name: "MCC UG NEET Counselling",
    authority: "Medical Counselling Committee, Government of India",
    kind: "national",
    region: "All India",
    coverage: "verified_full",
    notice: "Round 2 follows the MCC notice dated 27 August 2026 and the AIQ–State coordination schedule published on 2 September. MCC also states that the Round 2 reset option is available until 5:00 PM on 7 September 2026. Later-round dates remain tentative until a revised MCC notice is issued.",
    sources: [
      {
        label: "Round 2 official schedule",
        url: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/08/20260827178442175.pdf",
      },
      {
        label: "2026 master calendar",
        url: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/08/20260801732008988.pdf",
      },
      {
        label: "AIQ and State Round 2 coordination schedule",
        url: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/08/202609021737158592.pdf",
      },
      { label: "Latest MCC notices", url: "https://mcc.nic.in/ug-medical-counselling/" },
    ],
    events: [
      {
        id: "mcc-r1-registration",
        round: "Round 1",
        title: "Registration and payment",
        startAt: "2026-08-05T00:00:00+05:30",
        endAt: "2026-08-15T17:00:00+05:30",
        dateLabel: "5–15 Aug 2026 • payment closed at 5:00 PM",
      },
      {
        id: "mcc-r1-choices",
        round: "Round 1",
        title: "Choice filling and locking",
        startAt: "2026-08-06T00:00:00+05:30",
        endAt: "2026-08-18T23:59:00+05:30",
        dateLabel: "6–18 Aug 2026 • extended to 11:59 PM",
      },
      {
        id: "mcc-r1-result",
        round: "Round 1",
        title: "Seat allotment result",
        startAt: "2026-08-19T00:00:00+05:30",
        endAt: "2026-08-19T23:59:59+05:30",
        dateLabel: "19 Aug 2026",
      },
      {
        id: "mcc-r1-reporting",
        round: "Round 1",
        title: "Reporting and joining",
        startAt: "2026-08-20T00:00:00+05:30",
        endAt: "2026-08-25T23:59:59+05:30",
        dateLabel: "20–25 Aug 2026",
      },
      {
        id: "mcc-r2-matrix",
        round: "Round 2",
        title: "Tentative seat-matrix verification",
        startAt: "2026-09-01T00:00:00+05:30",
        endAt: "2026-09-02T23:59:59+05:30",
        dateLabel: "1–2 Sep 2026",
      },
      {
        id: "mcc-r2-registration",
        round: "Round 2",
        title: "Registration",
        startAt: "2026-09-03T13:00:00+05:30",
        endAt: "2026-09-08T15:00:00+05:30",
        dateLabel: "3 Sep, 1:00 PM – 8 Sep, 3:00 PM",
      },
      {
        id: "mcc-r2-payment",
        round: "Round 2",
        title: "Registration payment",
        startAt: "2026-09-03T13:00:00+05:30",
        endAt: "2026-09-08T18:00:00+05:30",
        dateLabel: "3 Sep, 1:00 PM – 8 Sep, 6:00 PM",
      },
      {
        id: "mcc-r2-choices",
        round: "Round 2",
        title: "Choice filling",
        startAt: "2026-09-03T00:00:00+05:30",
        endAt: "2026-09-09T10:00:00+05:30",
        dateLabel: "3 Sep – 9 Sep 2026, 10:00 AM",
      },
      {
        id: "mcc-r2-locking",
        round: "Round 2",
        title: "Choice locking",
        startAt: "2026-09-08T16:00:00+05:30",
        endAt: "2026-09-09T10:00:00+05:30",
        dateLabel: "8 Sep, 4:00 PM – 9 Sep, 10:00 AM",
      },
      {
        id: "mcc-r2-processing",
        round: "Round 2",
        title: "Processing of seat allotment",
        startAt: "2026-09-09T10:01:00+05:30",
        endAt: "2026-09-10T23:59:59+05:30",
        dateLabel: "9–10 Sep 2026",
      },
      {
        id: "mcc-r2-result",
        round: "Round 2",
        title: "Seat allotment result",
        startAt: "2026-09-11T00:00:00+05:30",
        endAt: "2026-09-11T23:59:59+05:30",
        dateLabel: "11 Sep 2026",
      },
      {
        id: "mcc-r2-reporting",
        round: "Round 2",
        title: "Reporting and joining",
        startAt: "2026-09-12T00:00:00+05:30",
        endAt: "2026-09-18T23:59:59+05:30",
        dateLabel: "12–18 Sep 2026",
      },
      {
        id: "mcc-r2-verification",
        round: "Round 2",
        title: "Verification of joined candidates",
        startAt: "2026-09-19T00:00:00+05:30",
        endAt: "2026-09-19T23:59:59+05:30",
        dateLabel: "19 Sep 2026",
      },
      {
        id: "mcc-r3-window",
        round: "Round 3",
        title: "Counselling window",
        startAt: "2026-09-10T00:00:00+05:30",
        endAt: "2026-09-18T23:59:59+05:30",
        dateLabel: "10–18 Sep 2026",
        note: "Original 1 August master-calendar date; await a revised MCC notice.",
        tentative: true,
        alertEligible: false,
      },
      {
        id: "mcc-r3-joining",
        round: "Round 3",
        title: "Last date of joining",
        startAt: "2026-09-26T00:00:00+05:30",
        endAt: "2026-09-26T23:59:59+05:30",
        dateLabel: "26 Sep 2026",
        note: "Original master-calendar date; subject to revision.",
        tentative: true,
        alertEligible: false,
      },
      {
        id: "mcc-stray-window",
        round: "Stray vacancy",
        title: "Counselling window",
        startAt: "2026-09-28T00:00:00+05:30",
        endAt: "2026-10-03T23:59:59+05:30",
        dateLabel: "28 Sep – 3 Oct 2026",
        note: "Original master-calendar date; subject to revision.",
        tentative: true,
        alertEligible: false,
      },
      {
        id: "mcc-stray-joining",
        round: "Stray vacancy",
        title: "Last date of joining",
        startAt: "2026-10-10T00:00:00+05:30",
        endAt: "2026-10-10T23:59:59+05:30",
        dateLabel: "10 Oct 2026",
        note: "Original master-calendar date; subject to revision.",
        tentative: true,
        alertEligible: false,
      },
    ],
  },
  {
    id: "haryana",
    shortName: "Haryana",
    name: "Haryana UG NEET Counselling",
    authority: "Department of Medical Education and Research, Haryana",
    kind: "state",
    region: "North",
    coverage: "verified_full",
    notice: "Updated from the official physical-verification notice dated 2 September 2026: provisional tuition-fee payment closed at 5:00 PM on 5 September, and verification dates are category-wise from 6–8 September. Later rounds have not yet been published.",
    sources: [
      {
        label: "Round 1 official schedule",
        url: "https://uhsrugcounselling.com/Images/Notifications/7.PDF?a=20260811014312",
      },
      {
        label: "Round 1 physical verification schedule",
        url: "https://uhsrugcounselling.com/Images/Notifications/164.PDF",
      },
      { label: "Latest Haryana notices", url: "https://uhsrugcounselling.com/Notice" },
    ],
    events: [
      {
        id: "hr-r1-registration",
        round: "Round 1",
        title: "Registration, editing, choice filling and locking",
        startAt: "2026-08-28T00:00:00+05:30",
        endAt: "2026-08-31T23:59:00+05:30",
        dateLabel: "28–31 Aug 2026 • until 11:59 PM",
      },
      {
        id: "hr-r1-provisional",
        round: "Round 1",
        title: "Provisional seat allocation",
        startAt: "2026-09-02T00:00:00+05:30",
        endAt: "2026-09-02T23:59:59+05:30",
        dateLabel: "2 Sep 2026",
      },
      {
        id: "hr-r1-grievances",
        round: "Round 1",
        title: "Allocation grievances",
        startAt: "2026-09-02T00:00:00+05:30",
        endAt: "2026-09-02T23:59:59+05:30",
        dateLabel: "2 Sep 2026",
      },
      {
        id: "hr-r1-final-list",
        round: "Round 1",
        title: "Final allocation after grievances",
        startAt: "2026-09-02T00:00:00+05:30",
        endAt: "2026-09-02T23:59:59+05:30",
        dateLabel: "2 Sep 2026",
      },
      {
        id: "hr-r1-fee",
        round: "Round 1",
        title: "Online provisional tuition-fee payment",
        startAt: "2026-09-02T00:00:00+05:30",
        endAt: "2026-09-05T17:00:00+05:30",
        dateLabel: "2–5 Sep 2026 • revised closing time 5:00 PM",
        note: "The 2 September physical-verification notice revised the closing time from 8:00 PM to 5:00 PM.",
      },
      {
        id: "hr-r1-verification",
        round: "Round 1",
        title: "Physical verification: NRI, PwBD, ESM, FF, BCA and BCB",
        startAt: "2026-09-06T09:00:00+05:30",
        endAt: "2026-09-06T23:59:59+05:30",
        dateLabel: "6 Sep 2026 • reporting starts at 9:00 AM",
        note: "Sushruta Auditorium, Pt. B. D. Sharma UHS, Rohtak. Personal appearance with original documents is mandatory.",
      },
      {
        id: "hr-r1-verification-open",
        round: "Round 1",
        title: "Physical verification: OSC, SC-D, EWS and OPEN",
        startAt: "2026-09-07T09:00:00+05:30",
        endAt: "2026-09-07T23:59:59+05:30",
        dateLabel: "7 Sep 2026 • reporting starts at 9:00 AM",
        note: "Sushruta Auditorium, Pt. B. D. Sharma UHS, Rohtak. Personal appearance with original documents is mandatory.",
      },
      {
        id: "hr-r1-verification-management",
        round: "Round 1",
        title: "Physical verification: Management and Minority",
        startAt: "2026-09-08T09:00:00+05:30",
        endAt: "2026-09-08T23:59:59+05:30",
        dateLabel: "8 Sep 2026 • reporting starts at 9:00 AM",
        note: "Sushruta Auditorium, Pt. B. D. Sharma UHS, Rohtak. Personal appearance with original documents is mandatory.",
      },
      {
        id: "hr-r1-letter",
        round: "Round 1",
        title: "Download provisional admission letter",
        startAt: "2026-09-06T00:00:00+05:30",
        endAt: "2026-09-09T23:59:59+05:30",
        dateLabel: "6–9 Sep 2026",
        note: "Available after successful document verification.",
      },
      {
        id: "hr-r1-joining",
        round: "Round 1",
        title: "Last date of joining allotted institute",
        startAt: "2026-09-09T00:00:00+05:30",
        endAt: "2026-09-09T16:00:00+05:30",
        dateLabel: "9 Sep 2026 • until 4:00 PM",
      },
    ],
  },
  {
    id: "up",
    shortName: "Uttar Pradesh",
    name: "UP UG NEET Counselling",
    authority: "Director General, Medical Education and Training, Uttar Pradesh",
    kind: "state",
    region: "North",
    coverage: "verified_full",
    notice: "The current revised Round 1 schedule is shown below. Later-round dates will appear after the UP authority publishes them.",
    sources: [
      { label: "Official UP NEET portal", url: "https://upneet.gov.in/" },
      { label: "DGME counselling notices", url: "https://dgme.up.gov.in/Welcome/counselling" },
    ],
    events: [
      {
        id: "up-r1-initial-registration",
        round: "Round 1",
        title: "Initial registration and document upload",
        startAt: "2026-08-07T12:00:00+05:30",
        endAt: "2026-08-12T14:00:00+05:30",
        dateLabel: "7 Aug, 12:00 PM – 12 Aug, 2:00 PM",
      },
      {
        id: "up-r1-extension",
        round: "Round 1",
        title: "Extended registration and document upload",
        startAt: "2026-08-13T11:00:00+05:30",
        endAt: "2026-08-14T14:00:00+05:30",
        dateLabel: "13 Aug, 11:00 AM – 14 Aug, 2:00 PM",
      },
      {
        id: "up-r1-fee-extension",
        round: "Round 1",
        title: "Extended fee and security-money deposit",
        startAt: "2026-08-13T11:00:00+05:30",
        endAt: "2026-08-14T17:00:00+05:30",
        dateLabel: "13 Aug, 11:00 AM – 14 Aug, 5:00 PM",
      },
      {
        id: "up-r1-reopen",
        round: "Round 1",
        title: "Reopened registration window",
        startAt: "2026-09-01T00:00:00+05:30",
        endAt: "2026-09-02T15:00:00+05:30",
        dateLabel: "1–2 Sep 2026 • closed at 3:00 PM",
      },
      {
        id: "up-r1-choices",
        round: "Round 1",
        title: "Online choice filling and locking",
        startAt: "2026-09-02T17:00:00+05:30",
        endAt: "2026-09-05T17:00:00+05:30",
        dateLabel: "2 Sep, 5:00 PM – 5 Sep, 5:00 PM",
      },
      {
        id: "up-r1-result",
        round: "Round 1",
        title: "Seat allotment result",
        startAt: "2026-09-07T00:00:00+05:30",
        endAt: "2026-09-07T23:59:59+05:30",
        dateLabel: "7 Sep 2026",
      },
      {
        id: "up-r1-admission",
        round: "Round 1",
        title: "Allotment letter, document verification and admission",
        startAt: "2026-09-08T00:00:00+05:30",
        endAt: "2026-09-14T23:59:59+05:30",
        dateLabel: "8–14 Sep 2026",
      },
    ],
  },
  {
    id: "tamil-nadu",
    shortName: "Tamil Nadu",
    name: "Tamil Nadu UG NEET Counselling",
    authority: "Selection Committee, Directorate of Medical Education & Research, Tamil Nadu",
    kind: "state",
    region: "South",
    coverage: "verified_full",
    notice: "The Selection Committee published tentative Round II schedules on 6 September 2026 for Government and Management Quota seats and the 7.5% Government School Students reservation. Both schedules use the same choice-filling, allotment, result and joining dates; registration-payment rules differ by stream. A separate resignation deadline will be announced later.",
    sources: [
      {
        label: "Round II schedule — Government and Management Quotas",
        url: "https://tnmedicalselection.net/news/06092026073135.pdf",
      },
      {
        label: "Round II schedule — 7.5% Government School Students",
        url: "https://tnmedicalselection.net/news/06092026073339.pdf",
      },
      { label: "Latest Tamil Nadu notices", url: "https://tnmedicalselection.net/" },
    ],
    events: [
      {
        id: "tn-r2-general-registration",
        round: "Round 2 • GQ/MQ",
        title: "Registration and payment (if not already paid)",
        startAt: "2026-09-07T10:00:00+05:30",
        endAt: "2026-09-08T17:00:00+05:30",
        dateLabel: "7 Sep, 10:00 AM – 8 Sep, 5:00 PM",
        note: "Government and Management Quotas, including NRI seats. Fresh registration is permitted only for candidates already named in the published Tamil Nadu merit list.",
        tentative: true,
      },
      {
        id: "tn-r2-seven-five-registration",
        round: "Round 2 • 7.5%",
        title: "Registration for Government School Students reservation",
        startAt: "2026-09-07T10:00:00+05:30",
        endAt: "2026-09-08T17:00:00+05:30",
        dateLabel: "7 Sep, 10:00 AM – 8 Sep, 5:00 PM",
        note: "No processing fee, security deposit or tuition fee applies to the 7.5% special reservation stream.",
        tentative: true,
      },
      {
        id: "tn-r2-virtual-vacancies",
        round: "Round 2 • All streams",
        title: "Processing of virtual vacancies",
        startAt: "2026-09-09T00:00:00+05:30",
        endAt: "2026-09-09T23:59:59+05:30",
        dateLabel: "9 Sep 2026",
        tentative: true,
      },
      {
        id: "tn-r2-choices",
        round: "Round 2 • All streams",
        title: "Choice filling",
        startAt: "2026-09-09T14:00:00+05:30",
        endAt: "2026-09-13T14:00:00+05:30",
        dateLabel: "9 Sep, 2:00 PM – 13 Sep, 2:00 PM",
        note: "Applies to the Government/Management Quota and 7.5% Government School Students schedules.",
        tentative: true,
      },
      {
        id: "tn-r2-locking",
        round: "Round 2 • All streams",
        title: "Choice locking",
        startAt: "2026-09-12T10:00:00+05:30",
        endAt: "2026-09-13T14:00:00+05:30",
        dateLabel: "12 Sep, 10:00 AM – 13 Sep, 2:00 PM",
        note: "Unlocked choices are automatically locked at the 2:00 PM closing deadline.",
        tentative: true,
      },
      {
        id: "tn-r2-allotment-processing",
        round: "Round 2 • All streams",
        title: "Processing of seat allotment",
        startAt: "2026-09-14T00:00:00+05:30",
        endAt: "2026-09-14T23:59:59+05:30",
        dateLabel: "14 Sep 2026",
        tentative: true,
      },
      {
        id: "tn-r2-result",
        round: "Round 2 • All streams",
        title: "Publication of result",
        startAt: "2026-09-15T00:00:00+05:30",
        endAt: "2026-09-15T23:59:59+05:30",
        dateLabel: "15 Sep 2026",
        tentative: true,
      },
      {
        id: "tn-r2-allotment-order",
        round: "Round 2 • All streams",
        title: "Download provisional allotment order",
        startAt: "2026-09-15T00:00:00+05:30",
        endAt: "2026-09-18T15:00:00+05:30",
        dateLabel: "15 Sep – 18 Sep, 3:00 PM",
        tentative: true,
      },
      {
        id: "tn-r2-joining",
        round: "Round 2 • All streams",
        title: "Last date of joining allotted college",
        startAt: "2026-09-18T00:00:00+05:30",
        endAt: "2026-09-18T17:00:00+05:30",
        dateLabel: "18 Sep 2026 • until 5:00 PM",
        note: "Original-certificate verification is performed at the allotted college during reporting.",
        tentative: true,
      },
    ],
  },
];

const STATE_ROUND_2_COORDINATION_SOURCE = "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/08/202609021737158592.pdf";

type CounsellingDirectoryEntry = {
  id: string;
  shortName: string;
  stateName: string;
  authority: string;
  officialUrl: string;
  kind?: "state" | "union_territory";
  region: string;
};

const COUNSELLING_DIRECTORY: CounsellingDirectoryEntry[] = [
  { id: "andhra-pradesh", shortName: "Andhra Pradesh", stateName: "Andhra Pradesh", authority: "Dr. N.T.R. University of Health Sciences", officialUrl: "https://drntr.uhsap.in/", region: "South" },
  { id: "arunachal-pradesh", shortName: "Arunachal Pradesh", stateName: "Arunachal Pradesh", authority: "Directorate of Higher & Technical Education, Arunachal Pradesh", officialUrl: "https://apjee.co.in/", region: "North East" },
  { id: "assam", shortName: "Assam", stateName: "Assam", authority: "Directorate of Medical Education, Assam", officialUrl: "https://dme.assam.gov.in/latest/admission-notice-ugpgothersnew", region: "North East" },
  { id: "bihar", shortName: "Bihar", stateName: "Bihar", authority: "Bihar Combined Entrance Competitive Examination Board", officialUrl: "https://bceceboard.bihar.gov.in/UGMACIndex.php", region: "East" },
  { id: "chhattisgarh", shortName: "Chhattisgarh", stateName: "Chhattisgarh", authority: "Directorate of Medical Education, Chhattisgarh", officialUrl: "https://cgdme.in/", region: "Central" },
  { id: "goa", shortName: "Goa", stateName: "Goa", authority: "Directorate of Technical Education, Goa", officialUrl: "https://dte.goa.gov.in/", region: "West" },
  { id: "gujarat", shortName: "Gujarat", stateName: "Gujarat", authority: "Admission Committee for Professional Undergraduate Medical Courses", officialUrl: "https://medadmgujarat.org/ug/home.aspx", region: "West" },
  { id: "himachal-pradesh", shortName: "Himachal Pradesh", stateName: "Himachal Pradesh", authority: "Atal Medical and Research University, Himachal Pradesh", officialUrl: "https://amruhp.ac.in/", region: "North" },
  { id: "jharkhand", shortName: "Jharkhand", stateName: "Jharkhand", authority: "Jharkhand Combined Entrance Competitive Examination Board", officialUrl: "https://jceceb.jharkhand.gov.in/", region: "East" },
  { id: "karnataka", shortName: "Karnataka", stateName: "Karnataka", authority: "Karnataka Examinations Authority", officialUrl: "https://cetonline.karnataka.gov.in/kea/", region: "South" },
  { id: "kerala", shortName: "Kerala", stateName: "Kerala", authority: "Commissioner for Entrance Examinations, Kerala", officialUrl: "https://cee.kerala.gov.in/cee/", region: "South" },
  { id: "madhya-pradesh", shortName: "Madhya Pradesh", stateName: "Madhya Pradesh", authority: "Directorate of Medical Education, Madhya Pradesh", officialUrl: "https://dme.mponline.gov.in/", region: "Central" },
  { id: "maharashtra", shortName: "Maharashtra", stateName: "Maharashtra", authority: "State Common Entrance Test Cell, Maharashtra", officialUrl: "https://cetcell.mahacet.org/", region: "West" },
  { id: "manipur", shortName: "Manipur", stateName: "Manipur", authority: "Directorate of Health Services, Manipur", officialUrl: "https://manipurhealthdirectorate.mn.gov.in/", region: "North East" },
  { id: "meghalaya", shortName: "Meghalaya", stateName: "Meghalaya", authority: "Department of Health & Family Welfare, Meghalaya", officialUrl: "https://meghealth.gov.in/", region: "North East" },
  { id: "mizoram", shortName: "Mizoram", stateName: "Mizoram", authority: "Department of Higher & Technical Education, Mizoram", officialUrl: "https://mc.mizoram.gov.in/", region: "North East" },
  { id: "nagaland", shortName: "Nagaland", stateName: "Nagaland", authority: "Directorate of Technical Education, Nagaland", officialUrl: "https://dtenagaland.org.in/", region: "North East" },
  { id: "odisha", shortName: "Odisha", stateName: "Odisha", authority: "Odisha Joint Entrance Examination Committee", officialUrl: "https://ojee.nic.in/counselling-for-mbbs_bds-courses/", region: "East" },
  { id: "punjab", shortName: "Punjab", stateName: "Punjab", authority: "Baba Farid University of Health Sciences", officialUrl: "https://bfuhs.ac.in/", region: "North" },
  { id: "rajasthan", shortName: "Rajasthan", stateName: "Rajasthan", authority: "Rajasthan NEET UG Medical & Dental Admission Board", officialUrl: "https://rajugneet2026.com/", region: "West" },
  { id: "sikkim", shortName: "Sikkim", stateName: "Sikkim", authority: "Health & Family Welfare Department, Government of Sikkim", officialUrl: "https://sikkim.gov.in/departments/health-family-welfare-department", region: "North East" },
  { id: "telangana", shortName: "Telangana", stateName: "Telangana", authority: "Kaloji Narayana Rao University of Health Sciences", officialUrl: "https://knruhs.telangana.gov.in/", region: "South" },
  { id: "tripura", shortName: "Tripura", stateName: "Tripura", authority: "Directorate of Medical Education, Tripura", officialUrl: "https://dme.tripura.gov.in/", region: "North East" },
  { id: "uttarakhand", shortName: "Uttarakhand", stateName: "Uttarakhand", authority: "Hemwati Nandan Bahuguna Uttarakhand Medical Education University", officialUrl: "https://hnbumu.ac.in/", region: "North" },
  { id: "west-bengal", shortName: "West Bengal", stateName: "West Bengal", authority: "West Bengal Medical Counselling Committee", officialUrl: "https://wbmcc.nic.in/", region: "East" },
  { id: "andaman-nicobar", shortName: "Andaman & Nicobar", stateName: "Andaman & Nicobar Islands", authority: "Andaman & Nicobar Administration", officialUrl: "https://collegeadmission.andaman.gov.in/", kind: "union_territory", region: "Islands" },
  { id: "chandigarh", shortName: "Chandigarh", stateName: "Chandigarh", authority: "Government Medical College & Hospital, Chandigarh", officialUrl: "https://gmch.gov.in/", kind: "union_territory", region: "North" },
  { id: "dadra-nagar-haveli-daman-diu", shortName: "DNH & DD", stateName: "Dadra & Nagar Haveli and Daman & Diu", authority: "NAMO Medical Education & Research Institute", officialUrl: "https://vbch.dnh.nic.in/", kind: "union_territory", region: "West" },
  { id: "delhi", shortName: "Delhi (IPU)", stateName: "Delhi", authority: "Guru Gobind Singh Indraprastha University", officialUrl: "https://ipu.admissions.nic.in/", kind: "union_territory", region: "North" },
  { id: "jammu-kashmir", shortName: "Jammu & Kashmir", stateName: "Jammu & Kashmir", authority: "J&K Board of Professional Entrance Examinations", officialUrl: "https://jkbopee.gov.in/", kind: "union_territory", region: "North" },
  { id: "ladakh", shortName: "Ladakh", stateName: "Ladakh", authority: "Health & Medical Education Department, Ladakh", officialUrl: "https://ladakh.gov.in/health-department/", kind: "union_territory", region: "North" },
  { id: "lakshadweep", shortName: "Lakshadweep", stateName: "Lakshadweep", authority: "Department of Education, Lakshadweep Administration", officialUrl: "https://lakshadweep.gov.in/departments/education/", kind: "union_territory", region: "Islands" },
  { id: "puducherry", shortName: "Puducherry", stateName: "Puducherry", authority: "Centralised Admission Committee, Puducherry", officialUrl: "https://centacpuducherry.in/", kind: "union_territory", region: "South" },
];

function coordinationEvents(id: string): OfficialScheduleEvent[] {
  return [
    {
      id: `${id}-r2-coordination-window`,
      round: "Round 2",
      title: "MCC-coordinated State counselling window",
      startAt: "2026-09-03T00:00:00+05:30",
      endAt: "2026-09-11T23:59:59+05:30",
      dateLabel: "3–11 Sep 2026",
      note: "National coordination window published by MCC. Check the selected authority's portal for its exact registration, choice-filling, result and reporting times.",
      alertEligible: false,
      scope: "national_coordination",
    },
    {
      id: `${id}-r2-joining-coordination`,
      round: "Round 2",
      title: "Coordinated last date of joining",
      startAt: "2026-09-18T00:00:00+05:30",
      endAt: "2026-09-18T23:59:59+05:30",
      dateLabel: "18 Sep 2026",
      note: "National coordination deadline. A state authority may publish more specific reporting instructions or an earlier cut-off time.",
      alertEligible: false,
      scope: "national_coordination",
    },
    {
      id: `${id}-r2-data-verification`,
      round: "Round 2",
      title: "Verification of joined-candidate data",
      startAt: "2026-09-19T00:00:00+05:30",
      endAt: "2026-09-19T23:59:59+05:30",
      dateLabel: "19 Sep 2026",
      note: "Authority-level data-verification milestone published in the MCC coordination notice.",
      alertEligible: false,
      scope: "national_coordination",
    },
  ];
}

const DIRECTORY_SCHEDULES: OfficialCounsellingSchedule[] = COUNSELLING_DIRECTORY.map((entry) => ({
  id: entry.id,
  shortName: entry.shortName,
  name: `${entry.stateName} UG NEET Counselling`,
  authority: entry.authority,
  notice: "The official authority is included in the nationwide schedule directory. Until its complete state-specific event table is verified, the timeline below shows only MCC's national State-counselling coordination milestones.",
  kind: entry.kind ?? "state",
  region: entry.region,
  coverage: "coordination_window",
  sources: [
    { label: `${entry.shortName} official portal`, url: entry.officialUrl },
    { label: "MCC State coordination notice", url: STATE_ROUND_2_COORDINATION_SOURCE },
  ],
  events: coordinationEvents(entry.id),
}));

export const OFFICIAL_COUNSELLING_SCHEDULES: OfficialCounsellingSchedule[] = [
  ...VERIFIED_COUNSELLING_SCHEDULES,
  ...DIRECTORY_SCHEDULES,
];

export function getScheduleEventState(event: OfficialScheduleEvent, now = Date.now()): ScheduleEventState {
  if (now < Date.parse(event.startAt)) return "upcoming";
  if (now <= Date.parse(event.endAt)) return "ongoing";
  return "completed";
}

export function getAlertableScheduleEvents(now = Date.now()) {
  const events = OFFICIAL_COUNSELLING_SCHEDULES.flatMap((schedule) =>
    schedule.events
      .filter((event) => !event.tentative && event.alertEligible !== false)
      .map((event) => ({ schedule, event, state: getScheduleEventState(event, now) })),
  );
  const ongoing = events
    .filter((item) => item.state === "ongoing")
    .sort((a, b) => Date.parse(a.event.endAt) - Date.parse(b.event.endAt));
  if (ongoing.length) return ongoing;
  return events
    .filter((item) => item.state === "upcoming")
    .sort((a, b) => Date.parse(a.event.startAt) - Date.parse(b.event.startAt))
    .slice(0, 3);
}
