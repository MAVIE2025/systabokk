CREATE TABLE "admin_actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"admin_dev_id" uuid NOT NULL,
	"action" text NOT NULL,
	"cible" text,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apis" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devs" ADD COLUMN "role" text DEFAULT 'dev' NOT NULL;--> statement-breakpoint
ALTER TABLE "devs" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devs" ADD COLUMN "blocked_reason" text;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_dev_id_devs_id_fk" FOREIGN KEY ("admin_dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_actions_created_idx" ON "admin_actions" USING btree ("created_at");