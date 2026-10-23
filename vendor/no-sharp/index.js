// sharp est volontairement absent : ses binaires libvips sont sous LGPL (règlement CADEV, art. 6).
module.exports = function sharp() {
  throw new Error("sharp est désactivé dans SystaBokk (licence LGPL interdite).");
};
