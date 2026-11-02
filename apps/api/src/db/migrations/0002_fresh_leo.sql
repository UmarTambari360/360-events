CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"dedupe_key" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"lease_expires_at" timestamp with time zone,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_dedupe_key_unique" UNIQUE("dedupe_key"),
	CONSTRAINT "outbox_attempts_check" CHECK ("outbox_events"."attempts" >= 0 AND "outbox_events"."attempts" <= "outbox_events"."max_attempts"),
	CONSTRAINT "outbox_max_attempts_check" CHECK ("outbox_events"."max_attempts" > 0),
	CONSTRAINT "outbox_processing_lease_check" CHECK ("outbox_events"."status" <> 'processing' OR ("outbox_events"."locked_by" IS NOT NULL AND "outbox_events"."lease_expires_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX "outbox_pending_run_at_idx" ON "outbox_events" USING btree ("run_at","id") WHERE "outbox_events"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "outbox_processing_lease_idx" ON "outbox_events" USING btree ("lease_expires_at","id") WHERE "outbox_events"."status" = 'processing';