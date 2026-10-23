// Vérifie qu'aucune dépendance n'est sous licence à réciprocité (GPL, LGPL, AGPL),
// interdites par l'article 6 du règlement CADEV. Échoue (code 1) sinon.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const raw = execSync("npx license-checker-rseidelsohn --production --json", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const pkgs = JSON.parse(raw);
const interdites = /(^|[^a-z])(a|l)?gpl/i;

const lignes = [];
const fautifs = [];
for (const [nom, info] of Object.entries(pkgs)) {
  const lic = Array.isArray(info.licenses) ? info.licenses.join(" OR ") : String(info.licenses);
  lignes.push(`| ${nom} | ${lic} |`);
  // « (MIT OR GPL-3.0) » reste acceptable : on choisit MIT. Seule une licence GPL sans alternative bloque.
  const alternatives = lic.replace(/[()]/g, "").split(/\s+OR\s+/i);
  if (alternatives.every((l) => interdites.test(l))) fautifs.push(`${nom} : ${lic}`);
}

writeFileSync(
  "LICENCES-DEPENDANCES.md",
  `# Licences des dépendances de production\n\nGénéré par \`npm run check:licenses\`. Aucune licence GPL, LGPL ou AGPL (règlement CADEV, art. 6).\n\n| Paquet | Licence |\n| --- | --- |\n${lignes.sort().join("\n")}\n`,
);

if (fautifs.length) {
  console.error("Licences interdites détectées :\n" + fautifs.join("\n"));
  process.exit(1);
}
console.log(`OK : ${lignes.length} paquets, aucune licence GPL, LGPL ou AGPL.`);
