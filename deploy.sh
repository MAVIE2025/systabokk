#!/bin/sh
# À lancer SUR le Cloud Server Systalink, dans le dossier du projet.
# Met à jour le code (si dépôt git distant), reconstruit, applique les migrations et attend que l'appli soit prête.
set -eu

if git remote get-url origin >/dev/null 2>&1; then
  git pull --ff-only
fi
APP_VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d-%H%M)"
export APP_VERSION

docker compose build --build-arg APP_VERSION="$APP_VERSION"
docker compose run --rm migrate
docker compose up -d

echo "Attente de /api/ready…"
for i in $(seq 1 30); do
  if docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/ready >/dev/null 2>&1; then
    echo "SystaBokk $APP_VERSION est en ligne."
    exit 0
  fi
  sleep 2
done
echo "L'appli ne répond pas : docker compose logs app" >&2
exit 1
