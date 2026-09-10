CREATE TABLE `student_directory` (
	`id` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`application_number` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_directory_application` ON `student_directory` (`application_number`);--> statement-breakpoint
CREATE INDEX `idx_student_directory_archived_updated` ON `student_directory` (`archived_at`,`updated_at`);