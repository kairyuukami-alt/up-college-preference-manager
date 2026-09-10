CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`window_start` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_attempts_updated_at` ON `auth_attempts` (`updated_at`);--> statement-breakpoint
CREATE TABLE `portal_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`list_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_portal_sessions_expires_at` ON `portal_sessions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `preference_lists` ADD `student_pin_hash` text;--> statement-breakpoint
ALTER TABLE `preference_lists` ADD `student_pin_salt` text;--> statement-breakpoint
PRAGMA optimize;
