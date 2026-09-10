CREATE TABLE `counselling_result_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`authority` text NOT NULL,
	`round_name` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`revision_note` text,
	`published_at` integer,
	`verified_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_result_releases_authority_round` ON `counselling_result_releases` (`authority`,`round_name`);--> statement-breakpoint
CREATE INDEX `idx_result_releases_verified` ON `counselling_result_releases` (`authority`,`verified_at`);--> statement-breakpoint
CREATE TABLE `counselling_results` (
	`id` text PRIMARY KEY NOT NULL,
	`authority` text NOT NULL,
	`round_name` text NOT NULL,
	`candidate_identifier` text NOT NULL,
	`identifier_type` text DEFAULT 'application_number' NOT NULL,
	`student_name` text,
	`neet_air` text,
	`college_name` text,
	`course` text,
	`quota` text,
	`allotted_category` text,
	`remark` text,
	`source_url` text NOT NULL,
	`published_at` integer,
	`verified_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_results_authority_round_candidate` ON `counselling_results` (`authority`,`round_name`,`candidate_identifier`);--> statement-breakpoint
CREATE INDEX `idx_results_candidate_lookup` ON `counselling_results` (`candidate_identifier`,`authority`);--> statement-breakpoint
CREATE INDEX `idx_results_air_lookup` ON `counselling_results` (`neet_air`,`authority`);--> statement-breakpoint
CREATE INDEX `idx_results_verified` ON `counselling_results` (`authority`,`verified_at`);