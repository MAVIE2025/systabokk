// Validation du FORMAT d'un numéro (indicatif + longueur), pas de son existence.

export const PAYS: Record<string, { indicatif: string; longueur: number; nom: string }> = {
  BF: { indicatif: "226", longueur: 8, nom: "Burkina Faso" },
  SN: { indicatif: "221", longueur: 9, nom: "Sénégal" },
  CI: { indicatif: "225", longueur: 10, nom: "Côte d'Ivoire" },
  ML: { indicatif: "223", longueur: 8, nom: "Mali" },
  NE: { indicatif: "227", longueur: 8, nom: "Niger" },
  TG: { indicatif: "228", longueur: 8, nom: "Togo" },
  BJ: { indicatif: "229", longueur: 10, nom: "Bénin" },
  GN: { indicatif: "224", longueur: 9, nom: "Guinée" },
  CM: { indicatif: "237", longueur: 9, nom: "Cameroun" },
};

export type ResultatTelephone =
  | { valide: true; pays: string; nom_pays: string; e164: string; national: string }
  | { valide: false; raison: string };

export function validerTelephone(numero: string, paysParDefaut?: string): ResultatTelephone {
  let chiffres = numero.replace(/[\s.\-()]/g, "");
  if (chiffres.startsWith("00")) chiffres = "+" + chiffres.slice(2);

  // Numéro international : on retrouve le pays par l'indicatif
  if (chiffres.startsWith("+")) {
    const corps = chiffres.slice(1);
    if (!/^\d+$/.test(corps)) return { valide: false, raison: "Caractères non numériques." };
    const entree = Object.entries(PAYS).find(([, p]) => corps.startsWith(p.indicatif));
    if (!entree) return { valide: false, raison: "Indicatif non pris en charge." };
    const [code, p] = entree;
    const national = corps.slice(p.indicatif.length);
    if (national.length !== p.longueur) {
      return { valide: false, raison: `${p.nom} : ${p.longueur} chiffres attendus après +${p.indicatif}.` };
    }
    return { valide: true, pays: code, nom_pays: p.nom, e164: "+" + corps, national };
  }

  // Numéro national : il faut le pays
  const code = (paysParDefaut ?? "").toUpperCase();
  const p = PAYS[code];
  if (!p) return { valide: false, raison: "Numéro sans indicatif : précisez ?pays=BF, SN, CI…" };
  if (!/^\d+$/.test(chiffres)) return { valide: false, raison: "Caractères non numériques." };
  if (chiffres.length !== p.longueur) {
    return { valide: false, raison: `${p.nom} : ${p.longueur} chiffres attendus.` };
  }
  return { valide: true, pays: code, nom_pays: p.nom, e164: `+${p.indicatif}${chiffres}`, national: chiffres };
}
