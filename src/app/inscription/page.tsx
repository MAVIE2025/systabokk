import { FormInscription } from "@/components/form-inscription";

export default function Inscription() {
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <p className="mt-1 text-muted">
        Une clé unique pour utiliser toutes les API et publier les vôtres. 1 000 FCFA de crédit de test offerts.
      </p>
      <div className="mt-6"><FormInscription /></div>
    </div>
  );
}
