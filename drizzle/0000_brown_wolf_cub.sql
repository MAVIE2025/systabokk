CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dev_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"label" text DEFAULT 'Clé principale' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "apis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"countries" text NOT NULL,
	"owner_dev_id" uuid NOT NULL,
	"upstream_url" text NOT NULL,
	"price_fcfa" integer NOT NULL,
	"prise_slug" text,
	"prise_priority" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apis_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"api_id" uuid NOT NULL,
	"consumer_dev_id" uuid NOT NULL,
	"via_prise" text,
	"status" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"price_fcfa" integer NOT NULL,
	"billed" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"country" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devs_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"dev_id" uuid,
	"amount_fcfa" integer NOT NULL,
	"kind" text NOT NULL,
	"call_id" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prises" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "probes" (
	"api_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"latency_ms" integer NOT NULL,
	CONSTRAINT "probes_api_id_at_pk" PRIMARY KEY("api_id","at")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"dev_id" uuid PRIMARY KEY NOT NULL,
	"balance_fcfa" integer DEFAULT 0 NOT NULL,
	"earned_fcfa" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_dev_id_devs_id_fk" FOREIGN KEY ("dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_owner_dev_id_devs_id_fk" FOREIGN KEY ("owner_dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_prise_slug_prises_slug_fk" FOREIGN KEY ("prise_slug") REFERENCES "public"."prises"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_consumer_dev_id_devs_id_fk" FOREIGN KEY ("consumer_dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_dev_id_devs_id_fk" FOREIGN KEY ("dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probes" ADD CONSTRAINT "probes_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_dev_id_devs_id_fk" FOREIGN KEY ("dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apis_prise_idx" ON "apis" USING btree ("prise_slug");--> statement-breakpoint
CREATE INDEX "calls_api_idx" ON "calls" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX "calls_created_idx" ON "calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ledger_dev_idx" ON "ledger" USING btree ("dev_id");