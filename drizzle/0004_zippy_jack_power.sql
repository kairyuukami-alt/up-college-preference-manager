CREATE TABLE `profile_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`document_name` text NOT NULL,
	`original_filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profile_documents_object_key` ON `profile_documents` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_profile_documents_list_uploaded` ON `profile_documents` (`list_id`,`uploaded_at`);--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`list_id` text PRIMARY KEY NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`locked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_student_profiles_updated_at` ON `student_profiles` (`updated_at`);