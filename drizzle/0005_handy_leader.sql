CREATE TABLE `counselling_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_name` text NOT NULL,
	`whatsapp_number` text NOT NULL,
	`topic` text NOT NULL,
	`question` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_counselling_questions_created_at` ON `counselling_questions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_counselling_questions_status` ON `counselling_questions` (`status`);