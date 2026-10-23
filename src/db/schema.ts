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
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("apis_prise_idx").on(t.priseSlug)],
);

/** Journal des appels passés par la passerelle. */
export const calls = pgTable(
  "calls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    apiId: uuid("api_id").notNull().references(() => apis.id),
    consumerDevId: uuid("consumer_dev_id").notNull().references(() => devs.id),
    viaPrise: text("via_prise"),
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
      enum: ["recharge", "reservation", "remboursement", "revenu", "commission"],
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
