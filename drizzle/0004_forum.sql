CREATE TABLE "forum_sujets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auteur_dev_id" uuid NOT NULL,
	"type" text DEFAULT 'question' NOT NULL,
	"titre" text NOT NULL,
	"corps" text NOT NULL,
	"categorie" text,
	"statut" text DEFAULT 'ouvert' NOT NULL,
	"reponse_validee_id" uuid,
	"nb_relances" integer DEFAULT 0 NOT NULL,
	"relance_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolu_at" timestamp with time zone,
	"supprime_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_reponses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sujet_id" uuid NOT NULL,
	"auteur_dev_id" uuid NOT NULL,
	"corps" text NOT NULL,
	"api_slug" text,
	"supprime_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_sujets" ADD CONSTRAINT "forum_sujets_auteur_dev_id_devs_id_fk" FOREIGN KEY ("auteur_dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reponses" ADD CONSTRAINT "forum_reponses_sujet_id_forum_sujets_id_fk" FOREIGN KEY ("sujet_id") REFERENCES "public"."forum_sujets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reponses" ADD CONSTRAINT "forum_reponses_auteur_dev_id_devs_id_fk" FOREIGN KEY ("auteur_dev_id") REFERENCES "public"."devs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_sujets_relance_idx" ON "forum_sujets" USING btree ("relance_at");--> statement-breakpoint
CREATE INDEX "forum_reponses_sujet_idx" ON "forum_reponses" USING btree ("sujet_id");
