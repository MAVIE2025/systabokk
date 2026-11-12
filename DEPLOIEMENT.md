# Mettre SystaBokk en ligne sur Systalink — pas à pas

Configuration retenue : **Base de données PostgreSQL à Dakar** (remise CADEV de 40 %, condition de
l'article 6) + **Web service (API)** déployé depuis GitHub. Systalink construit l'appli à partir du
`Dockerfile`, l'héberge et fournit le HTTPS. Aucun serveur à administrer.

Au premier démarrage, l'appli **crée seule ses tables** et charge les **données de démo** et le **Pass Jury**.

## 0. Tester sur son PC avant de déployer (recommandé)

Rien n'est publié : l'appli tourne sur votre ordinateur, branchée sur la base de Dakar.

```powershell
npm install
$env:DATABASE_URL="postgres://systabokk_db_u:VRAI_MOT_DE_PASSE@HOTE:VRAI_PORT/systabokk_db"
$env:DATABASE_SSL="require"
$env:PASS_JURY_KEY="sbk_live_test-local-1234567890abcdef"
npm run build
npm start
```

- Plus simple et sans encodage : à la place de `DATABASE_URL`, définissez `PGHOST`, `PGPORT`, `PGUSER`,
  `PGPASSWORD` (entre apostrophes simples dans PowerShell) et `PGDATABASE`.
- **Remplacez réellement** `VRAI_MOT_DE_PASSE` (bouton « Afficher » de la base) et `VRAI_PORT` (le **port public**,
  un nombre, visible quand la base accepte les connexions). Laisser ces mots tels quels provoque l'erreur
  `Invalid URL` au démarrage.
- Si le mot de passe contient `@ : / # ? %`, encodez-le dans PowerShell :
  `[uri]::EscapeDataString("le-mot-de-passe")`, et collez le résultat dans l'adresse.
- Succès : la console affiche `[démarrage] migrations appliquées` puis `données de démo prêtes`, et
  http://localhost:3000 indique « 8 API publiées ».
- En cas d'échec, la console donne la cause et une piste (mot de passe refusé, port, hôte introuvable…).

## 1. Base de données (Dakar, -40 %)

Sur https://platform.systalink.com → Créer un nouveau service → **Nouvelle base de données** :

- Nom : `systabokk-db` · Région : **Dakar (Sénégal)** · Moteur : **PostgreSQL**
- Formule : la plus petite suffit pour le concours.
- **Code promo CADEV (40 %)** avant de payer. **Gardez la facture** (preuve pour l'art. 6).

Une fois créée, notez les informations de connexion : hôte, port, utilisateur, mot de passe, nom de la base,
et si le **SSL** est exigé.

## 2. Mettre le code sur GitHub (dépôt privé)

1. Sur https://github.com/new : nom `systabokk`, **Private**, sans README. Créer.
2. Sur Windows, décompressez `systabokk.zip` (clic droit → Extraire tout), puis dans PowerShell :

```powershell
cd "C:\Users\Gael_\Desktop\hackaton systalink\systabokk\systabokk"
git remote add origin https://github.com/VOTRE_COMPTE/systabokk.git
git branch -M main
git push -u origin main
```

(Le dossier contient déjà l'historique git. Si `git` n'est pas installé : https://git-scm.com/download/win.)

## 3. Web service (API)

Créer un nouveau service → **Nouveau service web** → **Fournisseur Git** → **Continuer avec GitHub** →
autorisez l'accès au dépôt `systabokk`, puis :

| Réglage | Valeur |
| --- | --- |
| Branche | `main` |
| Méthode de construction | **Dockerfile** (à la racine du dépôt) |
| Port de l'application | `3000` |
| Région | Dakar si proposée |

**Variables d'environnement** à ajouter :

| Nom | Valeur |
| --- | --- |
| `PGHOST` | l'hôte public de la base (`postgres-dbaas-…systalinkdatabases.com`) |
| `PGPORT` | le port public (un nombre) |
| `PGUSER` | `systabokk_db_u` |
| `PGPASSWORD` | le mot de passe de la base, tel quel (aucun encodage à faire) |
| `PGDATABASE` | `systabokk_db` |
| `DATABASE_SSL` | `require` (**obligatoire** : la base Systalink exige le SSL, même si sa fiche affiche « disable ») |
| `PASS_JURY_KEY` | une clé longue qui commence par `sbk_live_` (voir ci-dessous) |
| `ADMIN_KEY` | **une autre** clé longue en `sbk_live_` : c'est votre accès à l'espace admin (gardez-la secrète) |
| `ADMIN_EMAIL` | l'e-mail du compte admin, ex. `admin@systabokk.dev` |
| `DEMO_ADMIN_TOKEN` | un mot secret quelconque |
| `CREATOR_SHARE_PERCENT` | `75` |

Pour fabriquer une clé dans PowerShell :
`"sbk_live_" + -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | % {[char]$_})`

Lancez le déploiement. Dans les journaux, vous devez voir :
`[démarrage] migrations appliquées`, `[démarrage] compte admin prêt` puis `[démarrage] données de démo prêtes`.

**Espace admin** : sur le site, « Mon compte » → collez la valeur de `ADMIN_KEY` → l'onglet **Admin** apparaît
(comptes, nouvelles clés, blocage, API, retraits des commissions, journal). Pour tout autre visiteur, `/admin` répond « page introuvable ».

## 4. Nom de domaine (facultatif, -40 %)

Si le Web service permet un domaine personnalisé, ajoutez par exemple `systabokk.votredomaine.com`
et créez l'enregistrement DNS demandé (souvent un CNAME). Sinon, l'adresse fournie par Systalink suffit.

## 5. Vérifier

- `https://…/api/ready` répond `{"statut":"pret"}`.
- Page **Pass Jury** → « Entrer avec le Pass Jury » → ouvrir une API → « Essayer ».
- Pass Jury → « Couper » le fournisseur A du paiement → « Essayer la prise Paiement » :
  la réponse indique « Servi par : paiement-b ».

## En cas de problème

| Symptôme | Cause probable |
| --- | --- |
| `/api/ready` répond `base_indisponible` | `DATABASE_URL` erronée, ou `DATABASE_SSL=require` oublié |
| Journaux : `SSL required (08P01)` | Ajouter `DATABASE_SSL=require` |
| Journaux : `self-signed certificate` | Mettre `DATABASE_SSL=require` |
| Page Pass Jury : « n'est pas configuré » | `PASS_JURY_KEY` absente des variables |
| Le build échoue | Vérifier que le build utilise le **Dockerfile** de la racine |

---

## Annexe — Alternative : un serveur virtuel avec Docker

Si vous utilisez un serveur (VPS) à la place du Web service, `docker-compose.yml` fait tourner l'appli,
PostgreSQL (non exposé à Internet) et le HTTPS (Caddy) sur la même machine :

```bash
curl -fsSL https://get.docker.com | sh
./scripts/preparer-env.sh systabokk.votredomaine.com
./deploy.sh
```

Attention : le règlement exclut de la remise les VPS situés hors de Dakar.
