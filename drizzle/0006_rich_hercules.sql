CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_events_list_created` ON `audit_events` (`list_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_events_created_at` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `counselling_deadlines` (
	`id` text PRIMARY KEY NOT NULL,
	`master_id` text NOT NULL,
	`title` text NOT NULL,
	`due_at` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_counselling_deadlines_master_due` ON `counselling_deadlines` (`master_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `preference_list_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`student_name` text NOT NULL,
	`college_ids_json` text NOT NULL,
	`actor_role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_preference_list_versions_list_created` ON `preference_list_versions` (`list_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `required_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`master_id` text NOT NULL,
	`document_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_required_documents_master_name` ON `required_documents` (`master_id`,`document_name`);--> statement-breakpoint
CREATE INDEX `idx_required_documents_master_id` ON `required_documents` (`master_id`);--> statement-breakpoint
CREATE TABLE `student_counselling_statuses` (
	`list_id` text PRIMARY KEY NOT NULL,
	`registration_status` text DEFAULT 'not_started' NOT NULL,
	`verification_status` text DEFAULT 'not_started' NOT NULL,
	`choice_filling_status` text DEFAULT 'not_started' NOT NULL,
	`allotment_status` text DEFAULT 'not_started' NOT NULL,
	`reporting_status` text DEFAULT 'not_started' NOT NULL,
	`admission_status` text DEFAULT 'not_started' NOT NULL,
	`admin_instructions` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_student_counselling_statuses_updated` ON `student_counselling_statuses` (`updated_at`);--> statement-breakpoint
ALTER TABLE `counselling_questions` ADD `priority` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `counselling_questions` ADD `assigned_counsellor` text;--> statement-breakpoint
ALTER TABLE `counselling_questions` ADD `reply_notes` text;--> statement-breakpoint
ALTER TABLE `counselling_questions` ADD `replied_at` integer;--> statement-breakpoint
ALTER TABLE `profile_documents` ADD `requirement_id` text;--> statement-breakpoint
ALTER TABLE `profile_documents` ADD `review_status` text DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_documents` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `profile_documents` ADD `reviewed_at` integer;