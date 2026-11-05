#!/bin/sh
# Crée le fichier .env de production avec des secrets aléatoires.
# Usage (sur le serveur) : ./scripts/preparer-env.sh systabokk.mondomaine.com
set -eu
[ $# -eq 1 ] || { echo "Usage : $0 <domaine>"; exit 1; }
[ -f .env ] && { echo ".env existe déjà : supprimez-le d'abord si vous voulez le régénérer."; exit 1; }

aleatoire() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-"$1"; }
MDP_DB=$(aleatoire 32)

cat > .env <<FIN
DOMAIN=$1
POSTGRES_PASSWORD=$MDP_DB
DATABASE_URL=postgres://systabokk:$MDP_DB@db:5432/systabokk
INTERNAL_BASE_URL=http://127.0.0.1:3000
CREATOR_SHARE_PERCENT=90
PASS_JURY_KEY=sbk_live_$(aleatoire 32)
DEMO_ADMIN_TOKEN=$(aleatoire 24)
FIN
chmod 600 .env
echo ".env créé pour $1 (secrets aléatoires, lisible par root seulement)."
