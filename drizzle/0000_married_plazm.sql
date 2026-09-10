CREATE TABLE `preference_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` text NOT NULL,
	`college_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `preference_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_preference_items_list_college` ON `preference_items` (`list_id`,`college_id`);--> statement-breakpoint
CREATE INDEX `idx_preference_items_list_position` ON `preference_items` (`list_id`,`position`);--> statement-breakpoint
CREATE TABLE `preference_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`student_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_preference_lists_updated_at` ON `preference_lists` (`updated_at`);--> statement-breakpoint
PRAGMA optimize;
