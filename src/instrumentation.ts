// Exécuté une fois au démarrage du serveur Next.js
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AUTO_MIGRATE !== "0") {
    const { demarrage } = await import("./lib/demarrage");
    // Sans « await » : le serveur répond tout de suite (contrôle de santé de l'hébergeur),
    // pendant que la base est préparée en arrière-plan.
    console.log("[démarrage] SystaBokk démarre, préparation de la base en arrière-plan…");
    // Filet de sécurité : une erreur imprévue est journalisée au lieu d'arrêter le conteneur
    process.on("unhandledRejection", (e) => console.error("[serveur] promesse rejetée :", e));
    process.on("uncaughtException", (e) => console.error("[serveur] exception non gérée :", e));
    demarrage().catch((e) => console.error("[démarrage] erreur inattendue :", e));
  }
}
