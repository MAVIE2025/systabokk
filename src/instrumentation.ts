// Exécuté une fois au démarrage du serveur Next.js
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AUTO_MIGRATE !== "0") {
    const { demarrage } = await import("./lib/demarrage");
    // Sans « await » : le serveur répond tout de suite (contrôle de santé de l'hébergeur),
    // pendant que la base est préparée en arrière-plan.
    console.log("[démarrage] SystaBokk démarre, préparation de la base en arrière-plan…");
    void demarrage();
  }
}
