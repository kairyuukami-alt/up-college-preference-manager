export type ProfileSubject = {
  name: string;
  maxMarks: string;
  obtained: string;
  group: "main" | "other" | "additional";
};

export type StudentProfileData = {
  fields: Record<string, string>;
  class10Subjects: ProfileSubject[];
  class12Subjects: ProfileSubject[];
};

export type ProfileFieldSpec = {
  key: string;
  label: string;
  type?: "text" | "date" | "email" | "select";
  options?: string[];
  placeholder?: string;
};

export type ProfileSection = {
  title: string;
  description?: string;
  fields: ProfileFieldSpec[];
};

const years = Array.from({ length: 16 }, (_, index) => String(new Date().getUTCFullYear() + 1 - index));

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    title: "Counselling & academic status",
    fields: [
      { key: "targetExam", label: "Target Exam", type: "select", options: ["NEET UG", "NEET PG", "JEE Main", "JEE Advanced", "CUET", "Other"] },
      { key: "academicStatus", label: "Academic Status", type: "select", options: ["Fresher", "Dropper", "Repeater", "Appearing"] },
    ],
  },
  {
    title: "1. Personal & contact details",
    fields: [
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "studentAadhaar", label: "Student's Aadhaar No. (12 digits)", placeholder: "12 digits" },
      { key: "bloodGroup", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { key: "religion", label: "Religion", type: "select", options: ["Hindu", "Muslim", "Sikh", "Christian", "Buddhist", "Jain", "Other"] },
      { key: "category", label: "Category" },
      { key: "identificationMark", label: "Identification Mark" },
      { key: "nationality", label: "Nationality" },
      { key: "nativityState", label: "Nativity (State)" },
      { key: "primaryMobile", label: "Primary Mobile (10 digits)", placeholder: "10 digits" },
      { key: "alternativeMobile", label: "Alternative Mobile (10 digits)", placeholder: "10 digits" },
      { key: "emergencyMobile", label: "Emergency Mobile (10 digits)", placeholder: "10 digits" },
      { key: "primaryEmail", label: "Primary Email", type: "email" },
      { key: "alternativeEmail", label: "Alternative Email", type: "email" },
      { key: "emergencyEmail", label: "Emergency Email", type: "email" },
    ],
  },
  {
    title: "2. Address details",
    fields: [
      { key: "houseName", label: "House Name / No." },
      { key: "streetName", label: "Street Name" },
      { key: "postOffice", label: "Post Office" },
      { key: "pinCode", label: "PIN Code (6 digits)", placeholder: "6 digits" },
      { key: "stateOrUnionTerritory", label: "State / Union Territory" },
      { key: "district", label: "District" },
    ],
  },
  {
    title: "3. Parent & financial details",
    fields: [
      { key: "fatherName", label: "Father's Name" },
      { key: "fatherAadhaar", label: "Father's Aadhaar (12 digits)" },
      { key: "fatherEducation", label: "Father's Education" },
      { key: "fatherOccupation", label: "Father's Occupation" },
      { key: "fatherDesignation", label: "Father's Designation" },
      { key: "fatherOrganization", label: "Father's Organization" },
      { key: "motherName", label: "Mother's Name" },
      { key: "motherAadhaar", label: "Mother's Aadhaar (12 digits)" },
      { key: "motherEducation", label: "Mother's Education" },
      { key: "motherOccupation", label: "Mother's Occupation" },
      { key: "motherDesignation", label: "Mother's Designation" },
      { key: "motherOrganization", label: "Mother's Organization" },
      { key: "annualFamilyIncome", label: "Annual Family Income", type: "select", options: ["Below ₹1 lakh", "₹1–2.5 lakh", "₹2.5–5 lakh", "₹5–8 lakh", "₹8–15 lakh", "Above ₹15 lakh"] },
    ],
  },
  {
    title: "Bank details",
    fields: [
      { key: "accountHolderName", label: "A/c Holder Name" },
      { key: "bankName", label: "Bank Name" },
      { key: "branchName", label: "Branch Name" },
      { key: "accountNumber", label: "Account Number (Numeric)" },
      { key: "ifscCode", label: "IFSC Code" },
      { key: "branchAddress", label: "Branch Address" },
    ],
  },
  {
    title: "4. Class 10th details",
    fields: [
      { key: "class10PassingYear", label: "Passing Year", type: "select", options: years },
      { key: "class10Board", label: "Board" },
      { key: "class10RollNumber", label: "Roll No." },
      { key: "class10RegistrationNumber", label: "Regn. No." },
      { key: "class10SerialNumber", label: "Serial No." },
      { key: "class10IssueDate", label: "Issue Date", type: "date" },
      { key: "class10SchoolName", label: "School Name" },
      { key: "class10SchoolType", label: "School Type", type: "select", options: ["Government", "Government Aided", "Private", "Open School", "Other"] },
      { key: "class10StateName", label: "State Name" },
    ],
  },
  {
    title: "5. Class 11th details",
    fields: [
      { key: "class11PassingYear", label: "Passing Year", type: "select", options: years },
      { key: "class11RollNumber", label: "Roll Number" },
      { key: "class11SchoolName", label: "School Name" },
      { key: "class11StateName", label: "State Name" },
    ],
  },
  {
    title: "6. Class 12th details",
    fields: [
      { key: "class12ExamStatus", label: "Passed / Appearing", type: "select", options: ["Passed", "Appearing"] },
      { key: "studiedSanskrit", label: "Studied Sanskrit at Plus Two?", type: "select", options: ["Yes", "No"] },
      { key: "apaarId", label: "APAAR ID" },
      { key: "class12PassingYear", label: "Passing Year", type: "select", options: years },
      { key: "class12Board", label: "Board" },
      { key: "class12RollNumber", label: "Roll No." },
      { key: "class12RegistrationNumber", label: "Regn. No." },
      { key: "class12SerialNumber", label: "Serial No." },
      { key: "class12IssueDate", label: "Issue Date", type: "date" },
      { key: "class12SchoolName", label: "School Name" },
      { key: "class12SchoolType", label: "School Type", type: "select", options: ["Government", "Government Aided", "Private", "Open School", "Other"] },
      { key: "class12StateName", label: "State Name" },
      { key: "class12SchoolCode", label: "School Code" },
      { key: "class12CenterCode", label: "Center Code" },
      { key: "class12AdmitCardId", label: "Admit Card ID" },
    ],
  },
];

const fixedFields = PROFILE_SECTIONS.flatMap((section) => section.fields);

function mainSubjects(names: string[]): ProfileSubject[] {
  return names.map((name) => ({ name, maxMarks: "100", obtained: "", group: "main" as const }));
}

export function emptyStudentProfile(): StudentProfileData {
  return {
    fields: Object.fromEntries(fixedFields.map((field) => [field.key, field.key === "nationality" ? "Indian" : ""])),
    class10Subjects: mainSubjects(["English", "Mathematics", "Science", "Social Science"]),
    class12Subjects: mainSubjects(["English", "Physics", "Chemistry", "Biology"]),
  };
}

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseSubjects(value: unknown, mainNames: string[]): ProfileSubject[] {
  const rows = Array.isArray(value) ? value : [];
  const main = mainNames.map((name) => {
    const match = rows.find((row) => row && typeof row === "object" && (row as Record<string, unknown>).group === "main" && (row as Record<string, unknown>).name === name) as Record<string, unknown> | undefined;
    return { name, maxMarks: cleanText(match?.maxMarks, 8) || "100", obtained: cleanText(match?.obtained, 8), group: "main" as const };
  });
  const extras = rows
    .filter((row) => row && typeof row === "object" && ["other", "additional"].includes(String((row as Record<string, unknown>).group)))
    .slice(0, 20)
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        name: cleanText(item.name, 100),
        maxMarks: cleanText(item.maxMarks, 8),
        obtained: cleanText(item.obtained, 8),
        group: item.group === "additional" ? "additional" as const : "other" as const,
      };
    });
  return [...main, ...extras];
}

export function normaliseStudentProfile(value: unknown): StudentProfileData {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sourceFields = source.fields && typeof source.fields === "object" ? source.fields as Record<string, unknown> : {};
  return {
    fields: Object.fromEntries(fixedFields.map((field) => [field.key, cleanText(sourceFields[field.key])])),
    class10Subjects: normaliseSubjects(source.class10Subjects, ["English", "Mathematics", "Science", "Social Science"]),
    class12Subjects: normaliseSubjects(source.class12Subjects, ["English", "Physics", "Chemistry", "Biology"]),
  };
}

export function validateStudentProfile(data: StudentProfileData) {
  const missing = fixedFields.filter((field) => !data.fields[field.key]?.trim()).map((field) => field.label);
  const invalid: string[] = [];
  for (const key of ["studentAadhaar", "fatherAadhaar", "motherAadhaar"]) {
    if (data.fields[key] && !/^\d{12}$/u.test(data.fields[key])) invalid.push(`${fixedFields.find((field) => field.key === key)?.label} must contain exactly 12 digits`);
  }
  for (const key of ["primaryMobile", "alternativeMobile", "emergencyMobile"]) {
    if (data.fields[key] && !/^\d{10}$/u.test(data.fields[key])) invalid.push(`${fixedFields.find((field) => field.key === key)?.label} must contain exactly 10 digits`);
  }
  if (data.fields.pinCode && !/^\d{6}$/u.test(data.fields.pinCode)) invalid.push("PIN Code must contain exactly 6 digits");
  if (data.fields.accountNumber && !/^\d+$/u.test(data.fields.accountNumber)) invalid.push("Account Number must be numeric");
  for (const key of ["primaryEmail", "alternativeEmail", "emergencyEmail"]) {
    if (data.fields[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(data.fields[key])) invalid.push(`${fixedFields.find((field) => field.key === key)?.label} is invalid`);
  }
  for (const [level, subjects] of [["Class 10", data.class10Subjects], ["Class 12", data.class12Subjects]] as const) {
    for (const subject of subjects) {
      if (!subject.name || !subject.maxMarks || !subject.obtained) {
        missing.push(`${level} subject name and marks`);
        continue;
      }
      const maximum = Number(subject.maxMarks);
      const obtained = Number(subject.obtained);
      if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(obtained) || obtained < 0 || obtained > maximum) {
        invalid.push(`${level} ${subject.name || "subject"} marks are invalid`);
      }
    }
  }
  return { valid: missing.length === 0 && invalid.length === 0, missing: [...new Set(missing)], invalid: [...new Set(invalid)] };
}

export function profileCompletion(data: StudentProfileData) {
  const fieldValues = fixedFields.map((field) => data.fields[field.key]);
  const subjectValues = [...data.class10Subjects, ...data.class12Subjects]
    .flatMap((subject) => [subject.name, subject.maxMarks, subject.obtained]);
  const values = [...fieldValues, ...subjectValues];
  return Math.round((values.filter((value) => value?.trim()).length / Math.max(1, values.length)) * 100);
}
