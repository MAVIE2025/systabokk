/** Catégories du catalogue : SystaBokk accepte tout type d'API. */
export const CATEGORIES = [
  { slug: "paiement", nom: "Paiement", exemple: "Mobile Money, cartes, liens de paiement" },
  { slug: "messagerie", nom: "Messagerie", exemple: "SMS, OTP, WhatsApp, USSD, e-mail" },
  { slug: "identite", nom: "Identité et vérification", exemple: "Numéros, pièces, IFU, NINEA" },
  { slug: "documents", nom: "Documents et facturation", exemple: "Factures, PDF, montants en lettres" },
  { slug: "finance", nom: "Finance et devises", exemple: "Conversion FCFA, taux, calculs" },
  { slug: "localisation", nom: "Cartes et localisation", exemple: "Géocodage, adresses, distances" },
  { slug: "ia-langues", nom: "IA et langues locales", exemple: "Traduction, voix, mooré, wolof, dioula" },
  { slug: "donnees", nom: "Données", exemple: "Météo, prix des marchés, agriculture" },
  { slug: "logistique", nom: "Logistique et transport", exemple: "Livraison, suivi de colis" },
  { slug: "sante-education", nom: "Santé et éducation", exemple: "Rendez-vous, résultats, scolarité" },
  { slug: "outils", nom: "Outils pour devs", exemple: "QR codes, images, conversions" },
  { slug: "autre", nom: "Autre", exemple: "Tout le reste" },
] as const;

export type CategorieSlug = (typeof CATEGORIES)[number]["slug"];

export const nomCategorie = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.nom ?? slug;

/** Pays proposés à la publication (zone CFA et voisins). */
export const PAYS_PUBLICATION = ["BF", "SN", "CI", "ML", "NE", "TG", "BJ", "GN", "CM", "GA", "CG", "TD"] as const;
