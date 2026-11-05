// Exécuté une fois au démarrage du serveur Next.js
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AUTO_MIGRATE !== "0") {
    const { demarrage } = await import("./lib/demarrage");
    await demarrage();
  }
}
