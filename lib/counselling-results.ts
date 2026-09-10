export const RESULT_AUTHORITIES = [
  {
    id: "haryana",
    shortName: "Haryana",
    name: "Haryana UG NEET Counselling",
    identifierLabel: "Haryana registration number",
    identifierHint: "Example: 2602523",
    officialPageUrl: "https://uhsrugcounselling.com/Notice",
    officialResultUrl: "https://uhsrugcounselling.com/Images/Notifications/162.PDF",
    officialHosts: ["uhsrugcounselling.com"],
    accent: "emerald" as const,
  },
  {
    id: "up",
    shortName: "UP",
    name: "UP UG NEET Counselling",
    identifierLabel: "UP registration or NEET roll number",
    identifierHint: "Enter the identifier printed in the official result",
    officialPageUrl: "https://upneet.gov.in/",
    officialResultUrl: "https://upneet.gov.in/vaccant_result/vseat_stream.aspx",
    officialHosts: ["upneet.gov.in", "dgme.up.gov.in"],
    accent: "blue" as const,
  },
  {
    id: "mcc",
    shortName: "MCC",
    name: "MCC UG NEET Counselling",
    identifierLabel: "NEET AIR or imported candidate identifier",
    identifierHint: "MCC's public allotment PDF is searchable by NEET AIR",
    officialPageUrl: "https://mcc.nic.in/ug-medical-counselling/",
    officialResultUrl: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/08/20260824606525705.pdf",
    officialHosts: ["mcc.nic.in", "cdnbbsr.s3waas.gov.in", "mcc.admissions.nic.in"],
    accent: "red" as const,
  },
] as const;

export type ResultAuthorityId = (typeof RESULT_AUTHORITIES)[number]["id"];

export type CounsellingResult = {
  id: string;
  authority: ResultAuthorityId;
  roundName: string;
  candidateIdentifier: string;
  identifierType: string;
  studentName: string;
  neetAir: string;
  collegeName: string;
  course: string;
  quota: string;
  allottedCategory: string;
  remark: string;
  sourceUrl: string;
  publishedAt: number | null;
  verifiedAt: number;
  createdAt: number;
  updatedAt: number;
};

export type ResultRelease = {
  id: string;
  authority: ResultAuthorityId;
  roundName: string;
  title: string;
  sourceUrl: string;
  revisionNote: string;
  publishedAt: number | null;
  verifiedAt: number;
  createdAt: number;
  updatedAt: number;
};

export function resultAuthority(value: unknown): ResultAuthorityId | null {
  const id = String(value ?? "").trim().toLowerCase();
  return RESULT_AUTHORITIES.some((item) => item.id === id) ? id as ResultAuthorityId : null;
}

export function cleanCandidateIdentifier(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 80);
}

export function cleanResultText(value: unknown, maximum = 300) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

export function isOfficialResultUrl(authorityId: ResultAuthorityId, value: unknown) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:") return false;
    const authority = RESULT_AUTHORITIES.find((item) => item.id === authorityId);
    return Boolean(authority?.officialHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)));
  } catch {
    return false;
  }
}

export function resultFromRow(row: Record<string, unknown>): CounsellingResult {
  return {
    id: String(row.id),
    authority: resultAuthority(row.authority) ?? "up",
    roundName: String(row.roundName),
    candidateIdentifier: String(row.candidateIdentifier),
    identifierType: String(row.identifierType ?? "application_number"),
    studentName: String(row.studentName ?? ""),
    neetAir: String(row.neetAir ?? ""),
    collegeName: String(row.collegeName ?? ""),
    course: String(row.course ?? ""),
    quota: String(row.quota ?? ""),
    allottedCategory: String(row.allottedCategory ?? ""),
    remark: String(row.remark ?? ""),
    sourceUrl: String(row.sourceUrl),
    publishedAt: row.publishedAt ? Number(row.publishedAt) : null,
    verifiedAt: Number(row.verifiedAt),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export function releaseFromRow(row: Record<string, unknown>): ResultRelease {
  return {
    id: String(row.id),
    authority: resultAuthority(row.authority) ?? "up",
    roundName: String(row.roundName),
    title: String(row.title),
    sourceUrl: String(row.sourceUrl),
    revisionNote: String(row.revisionNote ?? ""),
    publishedAt: row.publishedAt ? Number(row.publishedAt) : null,
    verifiedAt: Number(row.verifiedAt),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}
