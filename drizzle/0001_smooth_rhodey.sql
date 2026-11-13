ALTER TABLE "apis" ADD COLUMN "doc_url" text;--> statement-breakpoint
ALTER TABLE "apis" ADD COLUMN "example_method" text DEFAULT 'GET' NOT NULL;--> statement-breakpoint
ALTER TABLE "apis" ADD COLUMN "example_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "apis" ADD COLUMN "example_body" text;--> statement-breakpoint
CREATE INDEX "apis_owner_idx" ON "apis" USING btree ("owner_dev_id");