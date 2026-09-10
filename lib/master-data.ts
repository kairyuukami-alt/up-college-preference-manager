import { COLLEGES } from "@/lib/colleges";

export const BUILTIN_MASTER_ID = "builtin-up-private-mbbs-2026";
export const BUILTIN_MASTER_TITLE = "UP Private MBBS 2026";

export type MasterValue = string | number | boolean | null;

export type MasterCollege = {
  id: number;
  position: number;
  name: string;
  data: Record<string, MasterValue>;
};

export type MasterSummary = {
  id: string;
  title: string;
  sourceFilename: string;
  collegeCount: number;
  columns: string[];
  collegeNameKey: string;
  preferenceKey: string | null;
  builtin: boolean;
  updatedAt: number | null;
};

export const BUILTIN_COLUMNS = [
  "College Name",
  "Official College Name",
  "Seats",
  "Tuition Fee",
  "Non-AC Hostel",
  "AC Hostel",
  "Refundable Security",
  "Miscellaneous Fees",
  "First Year Total (Non-AC)",
  "First Year Total (AC)",
  "Comments",
];

export const BUILTIN_COLLEGES: MasterCollege[] = COLLEGES.map((college, index) => ({
  id: college.id,
  position: index + 1,
  name: college.name,
  data: {
    "College Name": college.name,
    "Official College Name": college.officialName,
    Seats: college.seats,
    "Tuition Fee": college.tuition,
    "Non-AC Hostel": college.nonAcHostel,
    "AC Hostel": college.acHostel,
    "Refundable Security": college.security,
    "Miscellaneous Fees": college.misc,
    "First Year Total (Non-AC)": college.firstYearNonAc,
    "First Year Total (AC)": college.firstYearAc,
    Comments: college.comments,
  },
}));

export const BUILTIN_MASTER: MasterSummary = {
  id: BUILTIN_MASTER_ID,
  title: BUILTIN_MASTER_TITLE,
  sourceFilename: "UP Colleges Final Sheet.xlsx",
  collegeCount: BUILTIN_COLLEGES.length,
  columns: BUILTIN_COLUMNS,
  collegeNameKey: "College Name",
  preferenceKey: null,
  builtin: true,
  updatedAt: null,
};
