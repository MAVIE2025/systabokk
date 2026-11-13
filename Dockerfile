# Image d'exécution seule : le site est DÉJÀ construit (branche « deploy »).
# Aucune compilation ici, donc le déploiement tient même sur une petite instance.
# Le code source est sur la branche « main » ; cette branche est générée depuis main.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
