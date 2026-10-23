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

1. **Publier.** Un dev publie son API hébergée sur Systalink et fixe son prix par appel, en FCFA.
2. **Utiliser.** Les autres l'appellent avec **une seule clé**, valable pour tout le catalogue.
3. **Gagner.** Chaque appel crédite le créateur (90 %) ; la plateforme garde une commission (10 %).
4. **Prises standard.** Une interface commune par besoin (ex. `paiement-mobile`) servie par
   plusieurs fournisseurs : si l'un tombe, la passerelle **bascule** sur le suivant, sans changer
   une ligne de code chez le client. Seul le fournisseur qui a répondu est facturé.

## Essayer

```bash
# Montant en lettres (2 FCFA)
curl -H "Authorization: Bearer $CLE" "https://DOMAINE/v1/apis/montant-en-lettres?montant=12500"

# Validation de numéro (1 FCFA)
curl -H "X-Api-Key: $CLE" "https://DOMAINE/v1/apis/telephone?numero=70123456&pays=BF"

# Prise standard « paiement mobile » (25 FCFA, mode test)
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
| Application et passerelle | Next.js 15 (une seule appli, routes `/v1/…`) | Cloud Server, Dakar |
| Données | PostgreSQL + Drizzle ORM | PostgreSQL géré |
| HTTPS | Caddy (certificat automatique) | — |
| Déploiement | Docker Compose, `deploy.sh` | Cloud Server |

**Facturation sûre.** Le prix est réservé de façon atomique (`update … where solde >= prix`) :
un solde ne peut jamais devenir négatif, même avec des appels simultanés. L'appel est ensuite
clôturé dans une seule transaction : revenu du créateur + commission en cas de succès,
remboursement en cas d'échec du fournisseur. Chaque mouvement est inscrit au grand livre (`ledger`).

**Clés.** Seul le hash SHA-256 de la clé est stocké ; la clé n'est montrée qu'une fois.

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

## Déployer sur le Cloud Server Systalink

1. Pointer le domaine (enregistrement A) vers l'IP du serveur.
2. Sur le serveur : installer Docker, cloner le dépôt, créer `.env` à partir de `.env.example`
   (`DATABASE_URL` du PostgreSQL géré, `DOMAIN`, un `DEMO_ADMIN_TOKEN` long et secret).
3. `./deploy.sh` — construit, migre, démarre, attend `/api/ready`.
4. Une fois : `docker compose run --rm migrate npm run db:seed` pour les données de démo.

## Démo : la bascule en direct

```bash
# Couper le fournisseur A (jeton de démo requis)
curl -X POST -H "x-demo-token: $DEMO_ADMIN_TOKEN" https://DOMAINE/demo-apis/paiement/a/panne
# Le paiement suivant passe par B : x-systabokk-fournisseur: paiement-b, x-systabokk-bascule: paiement-a
# Relancer la même commande pour rétablir A.
```

## Conformité au règlement CADEV

- **Produit Datacloud** (art. 6) : déploiement sur un Cloud Server Systalink à Dakar et
  PostgreSQL géré, acquis avec la remise de l'article 8.
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
