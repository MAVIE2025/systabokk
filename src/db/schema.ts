import {
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Développeurs : créateurs d'API et/ou consommateurs. */
export const devs = pgTable("devs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  country: text("country").notNull(), // code ISO : BF, SN, CI…
  role: text("role", { enum: ["dev", "admin"] }).notNull().default("dev"), // « admin » ouvre l'espace Systalink
  blockedAt: timestamp("blocked_at", { withTimezone: true }), // compte bloqué : clé refusée partout
  blockedReason: text("blocked_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Clé unique par dev, valable pour toutes les API. Seul le hash est stocké. */
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  devId: uuid("dev_id").notNull().references(() => devs.id),
  keyHash: text("key_hash").notNull().unique(),
  prefix: text("prefix").notNull(), // début visible de la clé, ex. « sbk_live_ab12 »
  label: text("label").notNull().default("Clé principale"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/** Portefeuille en FCFA (entiers : le FCFA n'a pas de centimes). */
export const wallets = pgTable("wallets", {
  devId: uuid("dev_id").primaryKey().references(() => devs.id),
  balanceFcfa: integer("balance_fcfa").notNull().default(0),
  earnedFcfa: integer("earned_fcfa").notNull().default(0),
});

/** Prises standard : une interface commune servie par plusieurs fournisseurs. */
export const prises = pgTable("prises", {
  slug: text("slug").primaryKey(), // ex. « paiement-mobile »
  name: text("name").notNull(),
  description: text("description").notNull(),
});

/** API publiées sur la bourse. */
export const apis = pgTable(
  "apis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    countries: text("countries").notNull(), // ex. « BF,SN,CI »
    ownerDevId: uuid("owner_dev_id").notNull().references(() => devs.id),
    upstreamUrl: text("upstream_url").notNull(), // URL de l'API hébergée sur Systalink
    priceFcfa: integer("price_fcfa").notNull(),
    priseSlug: text("prise_slug").references(() => prises.slug),
    prisePriority: integer("prise_priority").notNull().default(100),
    docUrl: text("doc_url"), // documentation du créateur (facultative)
    // Exemple d'appel utilisé par le bouton « Essayer » de la fiche
    exampleMethod: text("example_method").notNull().default("GET"),
    examplePath: text("example_path").notNull().default(""), // ex. « ?montant=12500 » ou « /envois »
    exampleBody: text("example_body"), // JSON pour POST/PUT
    isActive: boolean("is_active").notNull().default(true), // false = suspendue (invisible, non appelable)
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // supprimée par l'admin (gardée pour l'historique des appels)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("apis_prise_idx").on(t.priseSlug), index("apis_owner_idx").on(t.ownerDevId)],
);

/** Journal des appels passés par la passerelle. */
export const calls = pgTable(
  "calls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    apiId: uuid("api_id").notNull().references(() => apis.id),
    consumerDevId: uuid("consumer_dev_id").notNull().references(() => devs.id),
    viaPrise: text("via_prise"),
    canal: text("canal", { enum: ["http", "mcp", "site"] }).notNull().default("http"), // d'où vient l'appel
    status: integer("status").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    priceFcfa: integer("price_fcfa").notNull(),
    billed: boolean("billed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calls_api_idx").on(t.apiId), index("calls_created_idx").on(t.createdAt)],
);

/** Grand livre : chaque mouvement d'argent, signé (+ crédit, − débit). */
export const ledger = pgTable(
  "ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    devId: uuid("dev_id").references(() => devs.id), // null = plateforme (commission)
    amountFcfa: integer("amount_fcfa").notNull(),
    kind: text("kind", {
      enum: ["recharge", "reservation", "remboursement", "revenu", "commission", "retrait"],
    }).notNull(),
    callId: integer("call_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ledger_dev_idx").on(t.devId)],
);

/** Mesures de la sonde de fiabilité (remplie par la tâche planifiée). */
export const probes = pgTable(
  "probes",
  {
    apiId: uuid("api_id").notNull().references(() => apis.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    ok: boolean("ok").notNull(),
    latencyMs: integer("latency_ms").notNull(),
  },
  (t) => [primaryKey({ columns: [t.apiId, t.at] })],
);

/** Journal des actions de l'espace admin (qui a fait quoi, quand). */
export const adminActions = pgTable(
  "admin_actions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adminDevId: uuid("admin_dev_id").notNull().references(() => devs.id),
    action: text("action").notNull(), // ex. « bloquer_compte », « supprimer_api », « retrait »
    cible: text("cible"), // e-mail du compte ou slug de l'API concernée
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_actions_created_idx").on(t.createdAt)],
);

/**
 * Forum d'entraide entre développeurs.
 * « Oublié » n'est pas stocké : c'est un sujet encore ouvert dont la dernière relance date de plus de 7 jours.
 */
export const forumSujets = pgTable(
  "forum_sujets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    auteurDevId: uuid("auteur_dev_id").notNull().references(() => devs.id),
    type: text("type", { enum: ["question", "recherche_api"] }).notNull().default("question"),
    titre: text("titre").notNull(),
    corps: text("corps").notNull(),
    categorie: text("categorie"),
    statut: text("statut", { enum: ["ouvert", "resolu"] }).notNull().default("ouvert"),
    reponseValideeId: uuid("reponse_validee_id"),
    nbRelances: integer("nb_relances").notNull().default(0),
    relanceAt: timestamp("relance_at", { withTimezone: true }).notNull().defaultNow(), // création ou dernière relance
    resoluAt: timestamp("resolu_at", { withTimezone: true }),
    supprimeAt: timestamp("supprime_at", { withTimezone: true }), // retiré par l'admin
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_sujets_relance_idx").on(t.relanceAt)],
);

export const forumReponses = pgTable(
  "forum_reponses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sujetId: uuid("sujet_id").notNull().references(() => forumSujets.id),
    auteurDevId: uuid("auteur_dev_id").notNull().references(() => devs.id),
    corps: text("corps").notNull(),
    apiSlug: text("api_slug"), // API du catalogue proposée en réponse (facultatif)
    supprimeAt: timestamp("supprime_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_reponses_sujet_idx").on(t.sujetId)],
);
