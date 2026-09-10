import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const counsellingMasters = sqliteTable(
  "counselling_masters",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    sourceFilename: text("source_filename").notNull(),
    columnsJson: text("columns_json").notNull(),
    collegeNameKey: text("college_name_key").notNull(),
    preferenceKey: text("preference_key"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_counselling_masters_updated_at").on(table.updatedAt)],
);

export const masterColleges = sqliteTable(
  "master_colleges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    masterId: text("master_id")
      .notNull()
      .references(() => counsellingMasters.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    dataJson: text("data_json").notNull(),
  },
  (table) => [index("idx_master_colleges_master_position").on(table.masterId, table.position)],
);

export const preferenceLists = sqliteTable(
  "preference_lists",
  {
    id: text("id").primaryKey(),
    studentName: text("student_name").notNull(),
    masterId: text("master_id"),
    lockedAt: integer("locked_at"),
    studentPinHash: text("student_pin_hash"),
    studentPinSalt: text("student_pin_salt"),
    studentSetupHash: text("student_setup_hash"),
    studentSetupSalt: text("student_setup_salt"),
    studentSetupExpiresAt: integer("student_setup_expires_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_preference_lists_updated_at").on(table.updatedAt),
    index("idx_preference_lists_master_id").on(table.masterId),
  ],
);

export const portalSessions = sqliteTable(
  "portal_sessions",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    listId: text("list_id").references(() => preferenceLists.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("idx_portal_sessions_expires_at").on(table.expiresAt)],
);

export const authAttempts = sqliteTable(
  "auth_attempts",
  {
    key: text("key").primaryKey(),
    attempts: integer("attempts").notNull(),
    windowStart: integer("window_start").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_auth_attempts_updated_at").on(table.updatedAt)],
);

export const preferenceItems = sqliteTable(
  "preference_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listId: text("list_id")
      .notNull()
      .references(() => preferenceLists.id, { onDelete: "cascade" }),
    collegeId: integer("college_id").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("idx_preference_items_list_college").on(table.listId, table.collegeId),
    index("idx_preference_items_list_position").on(table.listId, table.position),
  ],
);

export const studentProfiles = sqliteTable(
  "student_profiles",
  {
    listId: text("list_id")
      .primaryKey()
      .references(() => preferenceLists.id, { onDelete: "cascade" }),
    dataJson: text("data_json").notNull().default("{}"),
    lockedAt: integer("locked_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_student_profiles_updated_at").on(table.updatedAt)],
);

export const profileDocuments = sqliteTable(
  "profile_documents",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => preferenceLists.id, { onDelete: "cascade" }),
    documentName: text("document_name").notNull(),
    originalFilename: text("original_filename").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    requirementId: text("requirement_id"),
    reviewStatus: text("review_status").notNull().default("uploaded"),
    rejectionReason: text("rejection_reason"),
    reviewedAt: integer("reviewed_at"),
    uploadedAt: integer("uploaded_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_profile_documents_object_key").on(table.objectKey),
    index("idx_profile_documents_list_uploaded").on(table.listId, table.uploadedAt),
  ],
);

export const counsellingQuestions = sqliteTable(
  "counselling_questions",
  {
    id: text("id").primaryKey(),
    studentName: text("student_name").notNull(),
    whatsappNumber: text("whatsapp_number").notNull(),
    topic: text("topic").notNull(),
    question: text("question").notNull(),
    priority: text("priority").notNull().default("normal"),
    assignedCounsellor: text("assigned_counsellor"),
    replyNotes: text("reply_notes"),
    repliedAt: integer("replied_at"),
    status: text("status").notNull().default("open"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_counselling_questions_created_at").on(table.createdAt),
    index("idx_counselling_questions_status").on(table.status),
  ],
);

export const requiredDocuments = sqliteTable(
  "required_documents",
  {
    id: text("id").primaryKey(),
    masterId: text("master_id").notNull(),
    documentName: text("document_name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_required_documents_master_name").on(table.masterId, table.documentName),
    index("idx_required_documents_master_id").on(table.masterId),
  ],
);

export const counsellingDeadlines = sqliteTable(
  "counselling_deadlines",
  {
    id: text("id").primaryKey(),
    masterId: text("master_id").notNull(),
    title: text("title").notNull(),
    dueAt: integer("due_at").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_counselling_deadlines_master_due").on(table.masterId, table.dueAt)],
);

export const studentCounsellingStatuses = sqliteTable(
  "student_counselling_statuses",
  {
    listId: text("list_id")
      .primaryKey()
      .references(() => preferenceLists.id, { onDelete: "cascade" }),
    registrationStatus: text("registration_status").notNull().default("not_started"),
    verificationStatus: text("verification_status").notNull().default("not_started"),
    choiceFillingStatus: text("choice_filling_status").notNull().default("not_started"),
    allotmentStatus: text("allotment_status").notNull().default("not_started"),
    reportingStatus: text("reporting_status").notNull().default("not_started"),
    admissionStatus: text("admission_status").notNull().default("not_started"),
    adminInstructions: text("admin_instructions"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_student_counselling_statuses_updated").on(table.updatedAt)],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    listId: text("list_id"),
    actorRole: text("actor_role").notNull(),
    eventType: text("event_type").notNull(),
    detailsJson: text("details_json").notNull().default("{}"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_audit_events_list_created").on(table.listId, table.createdAt),
    index("idx_audit_events_created_at").on(table.createdAt),
  ],
);

export const preferenceListVersions = sqliteTable(
  "preference_list_versions",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => preferenceLists.id, { onDelete: "cascade" }),
    studentName: text("student_name").notNull(),
    collegeIdsJson: text("college_ids_json").notNull(),
    actorRole: text("actor_role").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_preference_list_versions_list_created").on(table.listId, table.createdAt)],
);

export const studentCasework = sqliteTable(
  "student_casework",
  {
    listId: text("list_id")
      .primaryKey()
      .references(() => preferenceLists.id, { onDelete: "cascade" }),
    primaryCounsellorId: text("primary_counsellor_id"),
    backupCounsellorId: text("backup_counsellor_id"),
    priority: text("priority").notNull().default("normal"),
    coursesJson: text("courses_json").notNull().default("[]"),
    quotasJson: text("quotas_json").notNull().default("[]"),
    tagsJson: text("tags_json").notNull().default("[]"),
    nextAction: text("next_action"),
    nextActionDueAt: integer("next_action_due_at"),
    internalNotes: text("internal_notes"),
    studentInstructions: text("student_instructions"),
    roundsJson: text("rounds_json").notNull().default("[]"),
    tasksJson: text("tasks_json").notNull().default("[]"),
    allotmentsJson: text("allotments_json").notNull().default("[]"),
    financesJson: text("finances_json").notNull().default("[]"),
    communicationsJson: text("communications_json").notNull().default("[]"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_student_casework_primary_counsellor").on(table.primaryCounsellorId),
    index("idx_student_casework_priority_updated").on(table.priority, table.updatedAt),
  ],
);

export const portalAnnouncements = sqliteTable(
  "portal_announcements",
  {
    id: text("id").primaryKey(),
    masterId: text("master_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: text("priority").notNull().default("important"),
    dueAt: integer("due_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_portal_announcements_master_created").on(table.masterId, table.createdAt),
    index("idx_portal_announcements_due_at").on(table.dueAt),
  ],
);

export const counsellingResultReleases = sqliteTable(
  "counselling_result_releases",
  {
    id: text("id").primaryKey(),
    authority: text("authority").notNull(),
    roundName: text("round_name").notNull(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    revisionNote: text("revision_note"),
    publishedAt: integer("published_at"),
    verifiedAt: integer("verified_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_result_releases_authority_round").on(table.authority, table.roundName),
    index("idx_result_releases_verified").on(table.authority, table.verifiedAt),
  ],
);

export const counsellingResults = sqliteTable(
  "counselling_results",
  {
    id: text("id").primaryKey(),
    authority: text("authority").notNull(),
    roundName: text("round_name").notNull(),
    candidateIdentifier: text("candidate_identifier").notNull(),
    identifierType: text("identifier_type").notNull().default("application_number"),
    studentName: text("student_name"),
    neetAir: text("neet_air"),
    collegeName: text("college_name"),
    course: text("course"),
    quota: text("quota"),
    allottedCategory: text("allotted_category"),
    remark: text("remark"),
    sourceUrl: text("source_url").notNull(),
    publishedAt: integer("published_at"),
    verifiedAt: integer("verified_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_results_authority_round_candidate").on(table.authority, table.roundName, table.candidateIdentifier),
    index("idx_results_candidate_lookup").on(table.candidateIdentifier, table.authority),
    index("idx_results_air_lookup").on(table.neetAir, table.authority),
    index("idx_results_verified").on(table.authority, table.verifiedAt),
  ],
);

export const studentDirectory = sqliteTable('student_directory', {
  id: text('id').primaryKey(),
  dataJson: text('data_json').notNull(),
  applicationNumber: text('application_number'),
  revision: integer('revision').notNull().default(1),
  archivedAt: integer('archived_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [uniqueIndex('idx_student_directory_application').on(table.applicationNumber), index('idx_student_directory_archived_updated').on(table.archivedAt, table.updatedAt)]);
