CREATE TABLE `counselling_masters` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source_filename` text NOT NULL,
	`columns_json` text NOT NULL,
	`college_name_key` text NOT NULL,
	`preference_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_counselling_masters_updated_at` ON `counselling_masters` (`updated_at`);--> statement-breakpoint
CREATE TABLE `master_colleges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`master_id` text NOT NULL,
	`position` integer NOT NULL,
	`data_json` text NOT NULL,
	FOREIGN KEY (`master_id`) REFERENCES `counselling_masters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_master_colleges_master_position` ON `master_colleges` (`master_id`,`position`);--> statement-breakpoint
ALTER TABLE `preference_lists` ADD `master_id` text;--> statement-breakpoint
ALTER TABLE `preference_lists` ADD `locked_at` integer;--> statement-breakpoint
CREATE INDEX `idx_preference_lists_master_id` ON `preference_lists` (`master_id`);--> statement-breakpoint
CREATE TRIGGER `prevent_locked_list_details_update`
BEFORE UPDATE OF `student_name`, `master_id` ON `preference_lists`
WHEN OLD.`locked_at` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'preference_list_locked');
END;--> statement-breakpoint
CREATE TRIGGER `prevent_locked_list_delete`
BEFORE DELETE ON `preference_lists`
WHEN OLD.`locked_at` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'preference_list_locked');
END;--> statement-breakpoint
CREATE TRIGGER `prevent_locked_item_insert`
BEFORE INSERT ON `preference_items`
WHEN EXISTS (
	SELECT 1 FROM `preference_lists`
	WHERE `id` = NEW.`list_id` AND `locked_at` IS NOT NULL
)
BEGIN
	SELECT RAISE(ABORT, 'preference_list_locked');
END;--> statement-breakpoint
CREATE TRIGGER `prevent_locked_item_update`
BEFORE UPDATE ON `preference_items`
WHEN EXISTS (
	SELECT 1 FROM `preference_lists`
	WHERE `id` = OLD.`list_id` AND `locked_at` IS NOT NULL
)
BEGIN
	SELECT RAISE(ABORT, 'preference_list_locked');
END;--> statement-breakpoint
CREATE TRIGGER `prevent_locked_item_delete`
BEFORE DELETE ON `preference_items`
WHEN EXISTS (
	SELECT 1 FROM `preference_lists`
	WHERE `id` = OLD.`list_id` AND `locked_at` IS NOT NULL
)
BEGIN
	SELECT RAISE(ABORT, 'preference_list_locked');
END;--> statement-breakpoint
PRAGMA optimize;
