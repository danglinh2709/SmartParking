function smartNormalize(s = "") {
  return s
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/B/g, "8")
    .replace(/D/g, "0")
    .replace(/[^A-Z0-9]/g, "");
}

// so ký tự khác nhau
function diffCount(a, b) {
  if (a.length !== b.length) return Infinity;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}

function matchPlate(dbPlate, ocrPlate) {
  if (!dbPlate || !ocrPlate) return false;

  const a = smartNormalize(dbPlate);
  const b = smartNormalize(ocrPlate);

  if (a.length !== b.length) return false;

  const diff = diffCount(a, b);

  // cho phép sai 1 ký tự
  return diff <= 1;
}

module.exports = { smartNormalize, matchPlate };
