CREATE TYPE "public"."actor_type" AS ENUM('user', 'system', 'worker');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"outcome" text NOT NULL,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update_delete
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();