ALTER TABLE `preference_lists` ADD `student_setup_hash` text;--> statement-breakpoint
ALTER TABLE `preference_lists` ADD `student_setup_salt` text;--> statement-breakpoint
ALTER TABLE `preference_lists` ADD `student_setup_expires_at` integer;--> statement-breakpoint
PRAGMA optimize;
