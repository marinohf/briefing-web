// Prueba sin red ni clave: sustituye la llamada a Gemini por respuestas simuladas.  node scripts/test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intel-'));
process.env.DATA_DIR = tmp;
fs.cpSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data'), tmp, { recursive: true });

const L = await import('./lib.mjs');
const R = await import('./run.mjs');
const seed = L.readJSON(path.join(tmp, 'weeks', '2026-W42.json'));

// Fechas
assert.equal(L.isoWeek(L.parse('2026-10-12')).key, '2026-W42');
assert.equal(L.isoWeek(L.parse('2026-10-18')).key, '2026-W42');
assert.equal(L.isoWeek(L.parse('2027-01-01')).key, '2026-W53');
assert.equal(L.weekLabel(L.isoWeek(L.parse('2026-10-12'))), 'Semana 42, 12–18 Oct 2026');

// Validación: la semana real pasa; una rota se rechaza
L.validateWeek(structuredClone(seed));
const bad = structuredClone(seed); bad.risks[0].p = 140;
assert.throws(() => L.validateWeek(bad), /p\/\.i/);
assert.throws(() => L.validateDay({ items: [{ title: 'x', summary: 'y', source: 'z', importance: 9 }] }), /importance/);

// Gemini simulado
let calls = 0;
L.api.call = async (prompt, opt) => {
  calls++;
  if (prompt.includes('Convierte este texto')) return { text: JSON.stringify({ items: [{ title: 'Titular', summary: 'Resumen.', region: 'Mundo', importance: 4, source: 'Medio' }], markets: { brent: 99.5, wti: null, ttf: 47, us10y: 5.1 } }) };
  if (opt.search) return { text: 'noticias…', sources: [{ title: 'Medio', url: 'https://example.com/a' }] };
  if (prompt.includes('briefing de la semana')) { const w = structuredClone(seed); w.start = 'MAL'; w.label = 'MAL'; w.top10[0].sources = [{ title: 'ok', url: 'https://example.com/a' }, { title: 'inventada', url: 'https://inventada.test/x' }]; return { text: '```json\n' + JSON.stringify(w) + '\n```' }; }
  return { text: JSON.stringify({ thesis: 'T', winners: 'G', losers: 'P', outlook: 'O' }) };
};

for (let d = 19; d <= 25; d++) await R.daily(L.parse(`2026-10-${d}`));
assert.equal(L.listJSON(path.join(tmp, 'days')).length, 7);
const n = calls; await R.daily(L.parse('2026-10-19')); assert.equal(calls, n, 'idempotente: no repite un día ya generado');

await R.weekly(L.parse('2026-10-26'));
const w43 = L.readJSON(path.join(tmp, 'weeks', '2026-W43.json'));
assert.equal(w43.start, '2026-10-19'); assert.equal(w43.label, 'Semana 43, 19–25 Oct 2026');
assert.deepEqual(w43.top10[0].sources.map(s => s.url), ['https://example.com/a'], 'descarta URLs que el modelo no recibió');

await R.weekly(L.parse('2026-11-09')); // semana sin datos diarios: no se genera nada
assert.ok(!fs.existsSync(path.join(tmp, 'weeks', '2026-W45.json')));

await R.periods(L.parse('2026-11-01')); await R.periods(L.parse('2027-01-01'));
const ed = L.readJSON(path.join(tmp, 'editorial.json'));
assert.ok(ed.month['2026-10'] && ed.quarter['2026-Q4'] && ed.year['2026']);

L.build();
const db = L.readJSON(path.join(tmp, 'db.json'));
assert.deepEqual(Object.keys(db.weeks), ['2026-W42', '2026-W43']); assert.equal(Object.keys(db.days).length, 7);
console.log('OK: todas las pruebas pasan');
