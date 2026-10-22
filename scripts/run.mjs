// Uso: node scripts/run.mjs [auto|daily|weekly|periods]
//   auto    = diario siempre + resúmenes de periodo el día 1 de mes/trimestre/año (el semanal ya no es automático: se sube a mano como Markdown)
//   weekly  = genera con Gemini el semanal en JSON (sólo a mano, para el panel de datos)
//   RUN_DATE=AAAA-MM-DD simula otra fecha; FORCE=1 regenera lo que ya existe (el workflow lo activa solo en las ejecuciones manuales: la última ejecución del día sustituye a la anterior)
import path from 'node:path';
import fs from 'node:fs';
import { DATA, api, parseJSON, readJSON, writeJSON, listJSON, iso, addDays, parse, isoWeek, weekLabel, validateDay, validateWeek, validateEditorial, build } from './lib.mjs';
import { exportMd } from './export-md.mjs';

const FORCE = () => !!process.env.FORCE; // función: los tests lo activan y desactivan en caliente
const today = process.env.RUN_DATE ? parse(process.env.RUN_DATE) : parse(iso(new Date()));
const log = (...a) => console.log('[intel]', ...a);

// La IA a veces devuelve una noticia sin resumen: se descarta esa noticia en vez de tirar el día entero
// shortcut: un índice fuera de 0–100 o no numérico se descarta (null), no tumba el día; se pinta en gris
export const cleanTension = t => (Number.isFinite(t) && Math.round(t) >= 0 && Math.round(t) <= 100 ? Math.round(t) : null);
export const cleanAi = l => (Array.isArray(l) ? l : []).filter(a => [a?.title, a?.summary].every(s => typeof s === 'string' && s.trim()));

/* ---------- 1. Diario: noticias de las últimas 24 h + cierres de mercado ---------- */
export async function daily(date) {
  const f = path.join(DATA, 'days', iso(date) + '.json');
  if (fs.existsSync(f) && !FORCE()) return log('día ya generado, se omite', iso(date));
  const found = await api.call(
    `Hoy es ${iso(date)}. Busca en la web las noticias de las últimas 24 horas más relevantes de geopolítica, energía, bancos centrales y mercados (máximo 8). ` +
    `Para cada una indica: titular, resumen de 2 frases con hechos verificables, región, importancia del 1 al 5 y el nombre del medio que la publica. ` +
    `Además, hasta 4 noticias de inteligencia artificial con impacto económico o geopolítico (modelos, chips y semiconductores, regulación, inversión), indicando para cada una el medio y por qué importa. Al final da el último cierre conocido de Brent (USD/barril), WTI (USD/barril), gas TTF (EUR/MWh) y bono estadounidense a 10 años (%), indicando "no disponible" si no lo encuentras. No inventes datos. Por último, da el índice de tensión global del día, un entero de 0 a 100 según esta escala fija: 1-30 estable (sin crisis nuevas), 31-50 moderada (focos abiertos sin escalada), 51-75 alta (escalada, sanciones o estrés de mercados), 76-100 crítica (conflicto armado directo o shock energético/financiero). Justifícalo con las noticias de arriba, sin inventar.`,
    { search: true });
  const structured = await api.call(
    `Convierte este texto en JSON con exactamente esta forma: {"items":[{"title":"","summary":"","region":"","importance":1,"source":""}],"ai":[{"tag":"","title":"","summary":"","why":""}],"markets":{"brent":null,"wti":null,"ttf":null,"us10y":null},"tension":0}. ` +
    `tension es un entero de 0 a 100 (null si el texto no lo da); importance es un entero de 1 a 5; los mercados son números o null si el texto no los da. Usa sólo lo que dice el texto, en español.\n\nTEXTO:\n${found.text}`,
    { json: true });
  const raw = parseJSON(structured.text); raw.ai = cleanAi(raw.ai); raw.tension = cleanTension(raw.tension);
  const day = validateDay(raw);
  const sources = [...new Map(found.sources.map(s => [s.url, s])).values()].slice(0, 30);
  writeJSON(f, { date: iso(date), generatedAt: new Date().toISOString(), items: day.items, ai: day.ai || [], markets: day.markets || {}, tension: day.tension, sources });
  log('día escrito', iso(date), day.items.length, 'noticias');
}

/* ---------- 2. Semanal: sintetiza los días de la semana anterior en el formato de la web ---------- */
export async function weekly(date) {
  const w = isoWeek(addDays(date, -7)); // semana completa anterior a la fecha
  const f = path.join(DATA, 'weeks', w.key + '.json');
  if (fs.existsSync(f) && !FORCE()) return log('semana ya generada, se omite', w.key);
  const days = listJSON(path.join(DATA, 'days')).map(x => readJSON(path.join(DATA, 'days', x))).filter(d => d.date >= w.start && d.date <= w.end);
  if (!days.length) return log('sin datos diarios para', w.key, '— no se genera (no se inventa)');
  const prev = listJSON(path.join(DATA, 'weeks')).map(x => x.replace('.json', '')).filter(k => k < w.key).pop();
  if (!prev) throw new Error('No hay una semana anterior que sirva de plantilla');
  const template = readJSON(path.join(DATA, 'weeks', prev + '.json'));
  const allowed = new Map(days.flatMap(d => d.sources).map(s => [s.url, s]));
  const lastMarkets = [...days].reverse().map(d => d.markets).find(m => m && Object.values(m).some(v => v != null)) || {};
  const out = await api.call(
    `Eres analista senior de inteligencia geopolítica y macroeconómica. Redacta en español el briefing de la semana ${w.key} (${w.start} a ${w.end}).\n` +
    `Devuelve UN objeto JSON con EXACTAMENTE las mismas claves y estructura que la PLANTILLA (la semana anterior), con contenido nuevo basado SOLO en las NOTICIAS de esta semana.\n` +
    `Reglas: top10 con 10 claves ordenadas por impacto (id 1..10); stories entre 4 y 8 con análisis causal completo y ids únicos que empiecen por ${w.week}00; ` +
    `los valores level/tone solo pueden ser crit|warn|ok|info; timeframe solo puede ser hoy|3d|7d; risks con p (probabilidad %) e i (impacto 0-100) numéricos; ` +
    `añade "ai": lista de 0 a 6 elementos {"tag","title","summary","why","level","timeframe","sources"} con las noticias de IA más relevantes del campo ai de NOTICIAS ([] si no hay); las cifras numéricas deben salir de las noticias o de CIERRES; si no hay dato nuevo conserva el de la plantilla; ` +
    `no inventes citas, cifras ni hechos. Añade "sources":[{"title","url"}] a cada elemento de top10 y de stories usando SOLO URLs de la lista FUENTES.\n\n` +
    `PLANTILLA:\n${JSON.stringify(template)}\n\nNOTICIAS:\n${JSON.stringify(days.map(d => ({ date: d.date, items: d.items, ai: d.ai })))}\n\n` +
    `CIERRES (último día con datos): ${JSON.stringify(lastMarkets)}\n\nFUENTES:\n${JSON.stringify([...allowed.values()])}`,
    { json: true });
  const wk = parseJSON(out.text);
  wk.ai = cleanAi(wk.ai);
  wk.start = w.start; wk.label = weekLabel(w); // estos dos los fija el código, no el modelo
  const clean = list => (list || []).filter(s => allowed.has(s.url)); // se descartan URLs que el modelo no recibió
  [...(wk.top10 || []), ...(wk.stories || []), ...(wk.ai || [])].forEach(x => { x.sources = clean(x.sources); });
  writeJSON(f, validateWeek(wk));
  log('semana escrita', w.key);
}

/* ---------- 3. Resúmenes mensual, trimestral y anual (texto editorial) ---------- */
const quarterOf = d => `${d.getUTCFullYear()}-Q${Math.ceil((d.getUTCMonth() + 1) / 3)}`;
const CONTENT = process.env.CONTENT_DIR || path.join(DATA, '..', 'content');
const isoMonday = (y, w) => { const j4 = new Date(Date.UTC(y, 0, 4)); return addDays(j4, -((j4.getUTCDay() + 6) % 7) + (w - 1) * 7); };
// Material del periodo: 1) semanales .md subidos a mano, 2) semanas JSON, 3) diarios. Devuelve texto ya recortado.
export function material(inPeriod) {
  const dir = path.join(CONTENT, 'semanales');
  const md = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).map(f => ({ f, m: f.match(/^semana-(\d\d)-(\d{4})\.md$/) })).filter(x => x.m)
    .map(x => ({ f: x.f, d: isoMonday(+x.m[2], +x.m[1]) })).filter(x => inPeriod(x.d)).sort((p, q) => p.d - q.d)
    .map(x => fs.readFileSync(path.join(dir, x.f), 'utf8').slice(0, 6000)); // shortcut: 6000 caracteres por semanal, subir si se queda corto
  if (md.length) return md;
  const weeks = listJSON(path.join(DATA, 'weeks')).map(f => readJSON(path.join(DATA, 'weeks', f))).filter(w => inPeriod(parse(w.start)));
  if (weeks.length) return weeks.map(w => JSON.stringify({ semana: w.label, tension: w.tension.label, idea: w.bigIdea.title, historias: w.stories.map(s => ({ t: s.title, gp: s.winnersLosers })), riesgos: w.risks.map(r => ({ r: r.risk, p: r.p, i: r.i })) }));
  return listJSON(path.join(DATA, 'days')).map(f => readJSON(path.join(DATA, 'days', f))).filter(d => inPeriod(parse(d.date)))
    .map(d => d.date + ': ' + [...d.items].sort((p, q) => q.importance - p.importance).slice(0, 3).map(i => `${i.title} — ${i.summary}`).join(' | '));
}
async function editorial(level, key, inPeriod) {
  const ef = path.join(DATA, 'editorial.json'), ed = fs.existsSync(ef) ? readJSON(ef) : { month: {}, quarter: {}, year: {} };
  if (ed[level][key] && !FORCE()) return log('editorial ya existe', level, key);
  const mat = material(inPeriod);
  if (!mat.length) return log('sin material para', level, key);
  const out = await api.call(
    `Redacta en español el resumen editorial ${level === 'month' ? 'mensual' : level === 'quarter' ? 'trimestral' : 'anual'} (${key}) a partir de estos briefings. ` +
    `Devuelve JSON {"thesis":"","winners":"","losers":"","outlook":""}: tesis del periodo, ganadores, perdedores y proyección del siguiente periodo, 2-3 frases cada campo. Usa solo lo que consta en los briefings.\n\n${mat.join('\n\n---\n\n')}`,
    { json: true });
  ed[level][key] = validateEditorial(parseJSON(out.text));
  writeJSON(ef, ed);
  log('editorial escrito', level, key);
}
export async function periods(date) {
  const y = addDays(date, -1);
  if (date.getUTCDate() === 1) await editorial('month', iso(y).slice(0, 7), d => iso(d).slice(0, 7) === iso(y).slice(0, 7));
  if (date.getUTCDate() === 1 && date.getUTCMonth() % 3 === 0) await editorial('quarter', quarterOf(y), d => quarterOf(d) === quarterOf(y));
  if (date.getUTCDate() === 1 && date.getUTCMonth() === 0) await editorial('year', String(y.getUTCFullYear()), d => d.getUTCFullYear() === y.getUTCFullYear());
}

/* ---------- Orquestación ---------- */
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const mode = process.argv[2] || 'auto';
  try {
    if (mode === 'auto' || mode === 'daily') await daily(today);
    if (mode === 'weekly') await weekly(today); // el semanal ya no es automático: lo sube el usuario como Markdown; este modo queda sólo para lanzarlo a mano
    if (mode === 'periods' || mode === 'auto') await periods(today);
    build(); exportMd();
  } catch (e) { console.error('[intel] ERROR:', e.message); process.exit(1); }
}
