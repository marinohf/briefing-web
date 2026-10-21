// Prueba sin red ni clave: sustituye la llamada a Gemini por respuestas simuladas.  node scripts/test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intel-'));
process.env.DATA_DIR = tmp;
process.env.CONTENT_DIR = path.join(tmp, 'content'); // el export de Markdown también va a la carpeta temporal
fs.mkdirSync(path.join(tmp, 'weeks')); // fixture propia: las pruebas no dependen de los datos publicados
fs.copyFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', '2026-W42.json'), path.join(tmp, 'weeks', '2026-W42.json'));

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
assert.throws(() => L.validateDay({ items: [{ title: 'x', summary: 'y', source: 'z', importance: 3 }], ai: [{ title: 'sin resumen' }] }), /ai/);
assert.throws(() => L.validateDay({ items: [{ title: 'x', summary: 'y', source: 'z', importance: 9 }] }), /importance/);

// Una noticia de IA sin resumen se descarta; las demás se conservan
assert.deepEqual(R.cleanAi([{ title: 'a', summary: '' }, { title: 'b', summary: 'ok' }, null, { title: 'c' }]), [{ title: 'b', summary: 'ok' }]);
assert.deepEqual(R.cleanAi(undefined), []);

// Gemini simulado
let calls = 0;
L.api.call = async (prompt, opt) => {
  calls++;
  if (prompt.includes('Convierte este texto')) return { text: JSON.stringify({ items: [{ title: 'Titular', summary: 'Resumen.', region: 'Mundo', importance: 4, source: 'Medio' }], ai: [{ tag: 'Chips', title: 'Titular IA', summary: 'Resumen IA.', why: 'Importa.' }], markets: { brent: 99.5, wti: null, ttf: 47, us10y: 5.1 } }) };
  if (opt.search) return { text: 'noticias…', sources: [{ title: 'Medio', url: 'https://example.com/a' }] };
  if (prompt.includes('briefing de la semana')) { const w = structuredClone(seed); w.start = 'MAL'; w.label = 'MAL'; w.ai = [{ tag: 'Chips', title: 'IA', summary: 'S.', why: 'W.', sources: [{ title: 'ok', url: 'https://example.com/a' }, { title: 'x', url: 'https://inventada.test/y' }] }]; w.top10[0].sources = [{ title: 'ok', url: 'https://example.com/a' }, { title: 'inventada', url: 'https://inventada.test/x' }]; return { text: '```json\n' + JSON.stringify(w) + '\n```' }; }
  return { text: JSON.stringify({ thesis: 'T', winners: 'G', losers: 'P', outlook: 'O' }) };
};

for (let d = 19; d <= 25; d++) await R.daily(L.parse(`2026-10-${d}`));
assert.equal(L.listJSON(path.join(tmp, 'days')).length, 7);
const n = calls; await R.daily(L.parse('2026-10-19')); assert.equal(calls, n, 'idempotente: no repite un día ya generado');

// Misma fecha ejecutada otra vez a mano (FORCE): queda UN solo archivo y es el de la última ejecución
const f19 = path.join(tmp, 'days', '2026-10-19.json'), mock = L.api.call;
L.api.call = async (p, o) => { const r = await mock(p, o); return p.includes('Convierte este texto') ? { text: r.text.replace('Titular', 'Titular v2') } : r; };
process.env.FORCE = '1'; await R.daily(L.parse('2026-10-19')); delete process.env.FORCE; L.api.call = mock;
assert.equal(L.listJSON(path.join(tmp, 'days')).filter(x => x.startsWith('2026-10-19')).length, 1, 'un solo archivo por día');
assert.equal(L.readJSON(f19).items[0].title, 'Titular v2', 'FORCE: la última ejecución sustituye a la anterior');
await R.daily(L.parse('2026-10-19')); assert.equal(L.readJSON(f19).items[0].title, 'Titular v2', 'la ejecución automática posterior no pisa la manual');

await R.weekly(L.parse('2026-10-26'));
const w43 = L.readJSON(path.join(tmp, 'weeks', '2026-W43.json'));
assert.equal(w43.start, '2026-10-19'); assert.equal(w43.label, 'Semana 43, 19–25 Oct 2026');
assert.deepEqual(w43.ai[0].sources.map(s => s.url), ['https://example.com/a'], 'IA: descarta URLs no recibidas');
assert.equal(L.readJSON(path.join(tmp, 'days', '2026-10-19.json')).ai.length, 1);
assert.deepEqual(w43.top10[0].sources.map(s => s.url), ['https://example.com/a'], 'descarta URLs que el modelo no recibió');

const n2 = calls; await R.weekly(L.parse('2026-10-27')); assert.equal(calls, n2, 'weekly en martes: la semana ya existe, no llama a Gemini');
await R.weekly(L.parse('2026-11-09')); // semana sin datos diarios: no se genera nada
assert.ok(!fs.existsSync(path.join(tmp, 'weeks', '2026-W45.json')));

await R.periods(L.parse('2026-11-01')); await R.periods(L.parse('2027-01-01'));
const ed = L.readJSON(path.join(tmp, 'editorial.json'));
assert.ok(ed.month['2026-10'] && ed.quarter['2026-Q4'] && ed.year['2026']);

// material: semanal .md > semanas JSON > diarios
fs.mkdirSync(path.join(tmp, 'content', 'semanales'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'content', 'semanales', 'semana-43-2026.md'), '# Semana 43\nTEXTO-MD');
assert.ok(R.material(d => L.iso(d).slice(0, 7) === '2026-10').join('').includes('TEXTO-MD'), 'material: usa el .md subido');
assert.equal(R.material(d => L.iso(d).slice(0, 7) === '2026-11').length, 0, 'material: sin datos, vacío');
fs.rmSync(path.join(tmp, 'content', 'semanales'), { recursive: true });
assert.ok(R.material(d => L.iso(d).slice(0, 7) === '2026-10').length > 0, 'material: sin .md usa semanas/diarios');

L.build();
const dbText = fs.readFileSync(path.join(tmp, 'db.json'), 'utf8'); L.build();
assert.equal(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8'), dbText, 'build sin cambios no reescribe db.json');
const db = L.readJSON(path.join(tmp, 'db.json'));
assert.ok(db.weeks['2026-W42'] && db.weeks['2026-W43']); assert.equal(Object.keys(db.days).length, 7);
// Exportación a Markdown
const { exportMd } = await import('./export-md.mjs');
const wdir = path.join(tmp, 'content', 'semanales'); fs.mkdirSync(wdir, { recursive: true });
const mine = '# Mi semana 43\n\nTexto mío.\n'; fs.writeFileSync(path.join(wdir, 'semana-43-2026.md'), mine);
fs.writeFileSync(path.join(wdir, 'semana-42-2026.md'), '---\ntipo: semanal\n---\n\n# Semana 42\n'); fs.writeFileSync(path.join(wdir, 'notas.md'), 'x'); fs.writeFileSync(path.join(wdir, 'semana-99-2026.md'), 'x');
exportMd();
const idx = L.readJSON(path.join(tmp, 'content', 'index.json'));
assert.equal(idx.diarios.length, 7); assert.equal(idx.diarios[0].date, '2026-10-25', 'diarios: el más reciente primero');
assert.deepEqual(idx.semanales.map(s => s.slug), ['semana-43-2026', 'semana-42-2026'], 'semanales subidos a mano: indexados, y los nombres raros se ignoran');
assert.equal(idx.semanales[0].title, 'Mi semana 43'); assert.equal(idx.semanales[0].start, '2026-10-19'); assert.equal(idx.semanales[0].label, 'Semana 43, 19–25 Oct 2026');
const mdDay = fs.readFileSync(path.join(tmp, 'content', 'diarios', '2026-10-19.md'), 'utf8');
assert.match(mdDay, /^---\ntipo: diario\nfecha: 2026-10-19\nsemana: 2026-W43\nnoticias: 1\n---\n/);
assert.match(mdDay, /Titular v2/); assert.equal((mdDay.match(/### Titular v2/g) || []).length, 1, 'el día aparece una sola vez'); assert.match(mdDay, /## Inteligencia artificial/); assert.match(mdDay, /\| Brent \| 99\.5 \|/);
assert.equal(fs.readFileSync(path.join(wdir, 'semana-43-2026.md'), 'utf8'), mine, 'el export nunca reescribe un semanal subido a mano');
const stamp = fs.statSync(path.join(tmp, 'content', 'index.json')).mtimeMs; exportMd();
assert.equal(fs.statSync(path.join(tmp, 'content', 'index.json')).mtimeMs, stamp, 'export sin cambios no reescribe nada');
console.log('OK: todas las pruebas pasan');
