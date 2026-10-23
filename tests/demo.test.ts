import { test } from "node:test";
import assert from "node:assert/strict";
import { nombreEnLettres } from "../src/lib/demo/nombre-en-lettres";
import { validerTelephone } from "../src/lib/demo/telephone";
import { splitPrice } from "../src/lib/gateway";

test("montant en lettres : règles du français", () => {
  const cas: [number, string][] = [
    [0, "zéro"], [1, "un"], [21, "vingt et un"], [71, "soixante et onze"], [72, "soixante-douze"],
    [80, "quatre-vingts"], [81, "quatre-vingt-un"], [91, "quatre-vingt-onze"], [100, "cent"],
    [200, "deux cents"], [201, "deux cent un"], [1000, "mille"], [2000, "deux mille"],
    [80000, "quatre-vingt mille"], [200000, "deux cent mille"], [12500, "douze mille cinq cents"],
    [1_000_000, "un million"], [2_500_000, "deux millions cinq cent mille"],
    [180_000_000, "cent quatre-vingts millions"], [1_000_000_000, "un milliard"],
  ];
  for (const [n, attendu] of cas) assert.equal(nombreEnLettres(n), attendu, `n = ${n}`);
  assert.throws(() => nombreEnLettres(-1));
  assert.throws(() => nombreEnLettres(1.5));
});

test("téléphone : formats nationaux et internationaux", () => {
  assert.deepEqual(validerTelephone("70 12 34 56", "BF"), {
    valide: true, pays: "BF", nom_pays: "Burkina Faso", e164: "+22670123456", national: "70123456",
  });
  const sn = validerTelephone("+221 77 123 45 67");
  assert.ok(sn.valide && sn.pays === "SN" && sn.e164 === "+221771234567");
  assert.ok(validerTelephone("00225 07 07 07 07 07").valide);
  assert.equal(validerTelephone("7012345", "BF").valide, false);
  assert.equal(validerTelephone("70123456").valide, false);
  assert.equal(validerTelephone("+999123").valide, false);
});

test("répartition du prix : créateur 90 %, arrondi en faveur de la commission", () => {
  assert.deepEqual(splitPrice(25), { creator: 22, commission: 3 });
  assert.deepEqual(splitPrice(2), { creator: 1, commission: 1 });
  assert.deepEqual(splitPrice(100), { creator: 90, commission: 10 });
  assert.deepEqual(splitPrice(0), { creator: 0, commission: 0 });
});
