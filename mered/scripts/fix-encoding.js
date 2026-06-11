// One-shot repair for UTF-8 text that went through a cp1252 decode/encode
// round-trip (PowerShell 5.1 Get/Set-Content without explicit encoding).
'use strict';
const fs = require('fs');
const f = process.argv[2];
let c = fs.readFileSync(f, 'utf8');
const map = {
  'â”€': '─', // ─ box drawing
  'â€”': '—', // — em dash
  'â†’': '→', // → arrow
  'â‰ˆ': '≈', // ≈
  'â€“': '–', // – en dash
  'Â·': '·',       // ·
  'â‡„': '⇄', // ⇄
};
let n = 0;
for (const [bad, good] of Object.entries(map)) {
  const before = c.length;
  c = c.split(bad).join(good);
  if (c.length !== before) n++;
}
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1); // strip BOM
fs.writeFileSync(f, c, 'utf8');
const leftovers = (c.match(/â/g) || []).length;
console.log(`repaired ${n} sequence kinds; leftover suspicious bytes: ${leftovers}`);
