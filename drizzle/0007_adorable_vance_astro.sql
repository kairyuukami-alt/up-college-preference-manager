CREATE TABLE `portal_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`master_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`priority` text DEFAULT 'important' NOT NULL,
	`due_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portal_announcements_master_created` ON `portal_announcements` (`master_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_portal_announcements_due_at` ON `portal_announcements` (`due_at`);--> statement-breakpoint
CREATE TABLE `student_casework` (
	`list_id` text PRIMARY KEY NOT NULL,
	`primary_counsellor_id` text,
	`backup_counsellor_id` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`courses_json` text DEFAULT '[]' NOT NULL,
	`quotas_json` text DEFAULT '[]' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`next_action` text,
	`next_action_due_at` integer,
	`internal_notes` text,
	`student_instructions` text,
	`rounds_json` text DEFAULT '[]' NOT NULL,
	`tasks_json` text DEFAULT '[]' NOT NULL,
	`allotments_json` text DEFAULT '[]' NOT NULL,
	`finances_json` text DEFAULT '[]' NOT NULL,
	`communications_json` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_student_casework_primary_counsellor` ON `student_casework` (`primary_counsellor_id`);--> statement-breakpoint
CREATE INDEX `idx_student_casework_priority_updated` ON `student_casework` (`priority`,`updated_at`);