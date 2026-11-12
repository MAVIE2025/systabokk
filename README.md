# SystaBokk — la bourse des API africaines

> **Publie ton API. Gagne des FCFA à chaque appel.**
> Une clé, toutes les API d'Afrique, hébergées à Dakar.

Projet présenté au concours **CADEV 2026** organisé par Systalink, sur le thème
« Construire la plateforme d'échange africaine, pour les devs, par les devs ».

*Bokk* signifie « partager, avoir en commun » en wolof.

## Le problème

Chaque dev africain recode seul les mêmes intégrations : Wave, Orange Money, MTN MoMo, SMS,
validation de numéros, factures. Chaque opérateur et chaque pays a son API. Les jeunes devs,
eux, peinent à trouver un premier client.

## La solution

Sur SystaBokk, on n'échange pas que du savoir : on échange **des services qui tournent**.

1. **Publier.** Un dev publie son API — **de n'importe quel type** : paiement, SMS, traduction, cartes,
   données, documents… — hébergée sur Systalink, et fixe son prix par appel, en FCFA.
2. **Utiliser.** Les autres l'appellent avec **une seule clé**, valable pour tout le catalogue.
3. **Gagner.** Chaque appel crédite le créateur (75 %) ; la plateforme garde une commission (25 %).
4. **Prises standard.** Une interface commune par besoin (ex. `paiement-mobile`) servie par
   plusieurs fournisseurs : si l'un tombe, la passerelle **bascule** sur le suivant, sans changer
   une ligne de code chez le client. Seul le fournisseur qui a répondu est facturé.

## Agents IA : le MCP payant

SystaBokk expose un **serveur MCP** sur `/mcp` (transport « Streamable HTTP », JSON-RPC 2.0, sans état).
Un agent IA (Claude, Cursor…) authentifié avec la clé SystaBokk du développeur peut :

| Outil | Rôle | Payant |
| --- | --- | --- |
| `rechercher_api` | Chercher dans le catalogue (prix, description, exemple d'appel) | Non |
| `appeler_api` | Appeler une API à travers la passerelle | Oui, prix débité, 75 % au créateur |
| `appeler_prise` | Appeler une prise standard, avec bascule automatique | Oui, seul le fournisseur qui répond est payé |
| `mon_solde` | Solde, gains et dépenses | Non |

Les appels d'un agent passent par **la même passerelle** que les autres (mêmes règles de facturation, même
protection SSRF) ; ils sont marqués `canal = 'mcp'` en base. Testé avec le client MCP officiel
(`@modelcontextprotocol/sdk`).

```bash
claude mcp add --transport http systabokk https://DOMAINE/mcp --header "Authorization: Bearer $CLE"
```

La page `/agents` du site donne la configuration prête à copier.

## Essayer

```bash
# Montant en lettres (4 FCFA)
curl -H "Authorization: Bearer $CLE" "https://DOMAINE/v1/apis/montant-en-lettres?montant=12500"

# Validation de numéro (4 FCFA)
curl -H "X-Api-Key: $CLE" "https://DOMAINE/v1/apis/telephone?numero=70123456&pays=BF"

# Prise standard « paiement mobile » (20 FCFA, mode test)
curl -H "Authorization: Bearer $CLE" -H "content-type: application/json" \
  -d '{"montant":5000,"telephone":"+22670123456","reference":"CMD-1"}' \
  https://DOMAINE/v1/prises/paiement-mobile/paiements
```

Chaque réponse porte les en-têtes `x-systabokk-prix-fcfa`, `x-systabokk-solde-fcfa`
et, pour une prise, `x-systabokk-fournisseur` et `x-systabokk-bascule`.

| Code | Signification |
| --- | --- |
| 401 | Clé absente, inconnue ou révoquée |
| 402 | Solde insuffisant |
| 404 | API ou prise inconnue |
| 502 / 503 | Fournisseur(s) indisponible(s) — **le client n'est pas débité** |

## Architecture

| Couche | Choix | Produit Systalink |
| --- | --- | --- |
| Application et passerelle | Next.js 15 (une seule appli, routes `/v1/…`), image Docker | Web service (API) |
| Données | PostgreSQL + Drizzle ORM, migrations au démarrage | Base de données, Dakar |
| HTTPS et déploiement | Depuis GitHub, à chaque push | Web service (API) |

**Facturation sûre.** Le prix est réservé de façon atomique (`update … where solde >= prix`) :
un solde ne peut jamais devenir négatif, même avec des appels simultanés. L'appel est ensuite
clôturé dans une seule transaction : revenu du créateur + commission en cas de succès,
remboursement en cas d'échec du fournisseur. Chaque mouvement est inscrit au grand livre (`ledger`).

**Clés.** Seul le hash SHA-256 de la clé est stocké ; la clé n'est montrée qu'une fois. Sur le site,
elle est gardée dans un cookie httpOnly, jamais lisible par le JavaScript.

**Protection SSRF.** Une API publiée ne peut pas viser une adresse interne : https obligatoire, pas
d'identifiants dans l'URL, et le nom de domaine doit résoudre uniquement vers des IP publiques
(vérifié à la publication **et** à chaque appel ; les redirections ne sont pas suivies).

## Parcours sur le site

| Page | Ce qu'on y fait |
| --- | --- |
| `/` | Le message, les chiffres réels, les catégories d'API |
| `/catalogue` | Toutes les API, filtrables par catégorie et par recherche |
| `/catalogue/{api}` | Fiche : prix, fiabilité mesurée, exemple `curl`, bouton « Essayer » (appel réel payé) |
| `/inscription` | Compte en 30 s : la clé est affichée une fois, 1 000 FCFA de test offerts |
| `/espace` | Solde, gains, mes API, recharge de test |
| `/publier` | Publier une API de tout type, prix libre, prise standard facultative |
| `/jury` | Pass Jury : compte crédité, pannes simulées pour voir la bascule |
| `/agents` | Agents IA : brancher Claude ou Cursor sur le serveur MCP payant |

```
src/
  app/
    v1/apis/[slug]/…        passerelle : appel direct d'une API
    v1/prises/[prise]/…     passerelle : prise standard avec bascule
    demo-apis/…             API de démonstration (montant en lettres, téléphone, paiement A/B)
    api/health, api/ready   santé de l'appli et de la base
    page.tsx, catalogue/    accueil (chiffres réels) et catalogue
  lib/gateway.ts            réservation, relais, clôture, bascule
  db/schema.ts              schéma de la base
scripts/seed.ts             données de démo + clé Pass Jury
drizzle/                    migrations SQL
```

## Développer en local (Windows, macOS ou Linux)

Prérequis : Node.js 20 ou plus, et PostgreSQL (ou Docker Desktop).

```bash
cp .env.example .env              # puis ajuster DATABASE_URL
npm install
docker compose --profile local-db up -d db   # si vous n'avez pas PostgreSQL
npm run db:migrate
npm run db:seed                   # affiche la clé du Pass Jury
npm run dev                       # http://localhost:3000
```

Vérifications : `npm test`, `npm run typecheck`, `npm run lint`, `npm run check:licenses`.

## Déployer sur Systalink

Voir **[DEPLOIEMENT.md](DEPLOIEMENT.md)**. Configuration retenue : **Base de données PostgreSQL à Dakar**
(remise CADEV, condition de l'art. 6) + **Web service (API)** construit depuis GitHub avec le `Dockerfile`.
Au premier démarrage, l'appli applique ses migrations et charge les données de démo toute seule
(`src/instrumentation.ts`). Une variante tout-en-un sur serveur virtuel (Docker Compose + Caddy) est décrite
en annexe.

## Démo : la bascule en direct

Le plus simple : page **Pass Jury**, bouton « Couper » du fournisseur A, puis « Essayer » sur la prise.
En ligne de commande :

```bash
# Couper le fournisseur A (jeton de démo requis)
curl -X POST -H "x-demo-token: $DEMO_ADMIN_TOKEN" https://DOMAINE/demo-apis/paiement/a/panne
# Le paiement suivant passe par B : x-systabokk-fournisseur: paiement-b, x-systabokk-bascule: paiement-a
# Relancer la même commande pour rétablir A.
```

## Conformité au règlement CADEV

- **Produit Datacloud** (art. 6) : la Base de données PostgreSQL à Dakar, acquise avec la remise de
  l'article 8, est utilisée par le déploiement ; l'appli tourne sur un Web service Systalink.
- **Licences** (art. 6) : uniquement des licences permissives. `npm run check:licenses` échoue
  si une dépendance de production est sous GPL, LGPL ou AGPL, et génère `LICENCES-DEPENDANCES.md`.
  `sharp` (dont les binaires libvips sont sous LGPL) est remplacé par un module vide
  (`vendor/no-sharp`) et l'optimisation d'images de Next.js est désactivée.
- **Paiements** : tous les paiements sont **simulés (mode test)**, aucun argent réel ne circule.

### Usage de l'intelligence artificielle (déclaration, art. 6)

- **Outil :** Claude (Anthropic).
- **Parties concernées :** aide à la conception du concept et du dossier ; génération du
  squelette initial (passerelle, facturation, schéma de base, API de démo, pages, déploiement)
  et des tests, relus et validés par l'équipe.
- *À compléter par l'équipe au fil du projet.*

## Droits

© 2026 Équipe SystaBokk — tous droits réservés. Le code n'est pas publié sous licence libre :
le règlement CADEV évoque une exploitation exclusive de la solution lauréate (art. 6), à vérifier
avant de choisir une licence.
