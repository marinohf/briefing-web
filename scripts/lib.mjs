import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const writeJSON = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); };
export const listJSON = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : []);

/* ---------- Fechas (todo en UTC) ---------- */
export const iso = d => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
export const parse = s => new Date(s + 'T00:00:00Z');
// Semana ISO (lunes a domingo) a la que pertenece la fecha d
export function isoWeek(d) {
  const monday = addDays(d, -((d.getUTCDay() + 6) % 7)), thursday = addDays(monday, 3), year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4)), jan4Monday = addDays(jan4, -((jan4.getUTCDay() + 6) % 7));
  const week = 1 + Math.round((monday - jan4Monday) / 864e5 / 7);
  return { key: `${year}-W${String(week).padStart(2, '0')}`, week, year, start: iso(monday), end: iso(addDays(monday, 6)) };
}
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export function weekLabel(w) {
  const s = parse(w.start), e = parse(w.end), m = d => MES[d.getUTCMonth()];
  const range = s.getUTCMonth() === e.getUTCMonth() ? `${s.getUTCDate()}–${e.getUTCDate()} ${m(e)} ${e.getUTCFullYear()}`
    : `${s.getUTCDate()} ${m(s)}–${e.getUTCDate()} ${m(e)} ${e.getUTCFullYear()}`;
  return `Semana ${w.week}, ${range}`;
}

/* ---------- Gemini (se sustituye en los tests: api.call = ...) ---------- */
export const api = {
  // Devuelve { text, sources }. search:true usa Google Search; json:true pide JSON (no se pueden combinar de forma fiable).
  async call(prompt, { search = false, json = false } = {}) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Falta la variable GEMINI_API_KEY');
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    if (search) body.tools = [{ google_search: {} }];
    if (json) body.generationConfig = { responseMimeType: 'application/json', temperature: 0.2 };
    let r;
    for (let i = 0; i < 4; i++) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
      if (r.ok) break;
      if ([429, 500, 503].includes(r.status) && i < 3) { await sleep(3000 * 2 ** i); continue; }
      throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
    }
    const c = (await r.json()).candidates?.[0];
    const text = (c?.content?.parts || []).map(p => p.text || '').join('');
    if (!text.trim()) throw new Error('Gemini devolvió una respuesta vacía');
    const sources = (c.groundingMetadata?.groundingChunks || []).map(g => g.web).filter(w => w?.uri).map(w => ({ title: w.title || w.uri, url: w.uri }));
    return { text, sources };
  }
};
export const parseJSON = t => JSON.parse(t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));

/* ---------- Validación: si falla, el job falla y no se publica nada ---------- */
const TONES = ['crit', 'warn', 'ok', 'info'];
const fail = m => { throw new Error('Validación: ' + m); };
const str = (o, k, p) => (typeof o?.[k] === 'string' && o[k].trim()) || fail(`${p}.${k} debe ser texto`);
const arr = (o, k, p, min = 1) => (Array.isArray(o?.[k]) && o[k].length >= min) || fail(`${p}.${k} debe ser lista de al menos ${min}`);
const num = (v, p) => (typeof v === 'number' && Number.isFinite(v)) || fail(`${p} debe ser número`);
const tone = (o, k, p) => TONES.includes(o?.[k]) || fail(`${p}.${k} debe ser ${TONES.join('|')}`);

export function validateDay(d) {
  arr(d, 'items', 'day'); if (d.items.length > 15) fail('day.items tiene demasiadas noticias');
  d.items.forEach((x, i) => { const p = `day.items[${i}]`; str(x, 'title', p); str(x, 'summary', p); str(x, 'source', p); Number.isInteger(x.importance) && x.importance >= 1 && x.importance <= 5 || fail(p + '.importance debe ser 1–5'); });
  for (const k of ['brent', 'wti', 'ttf', 'us10y']) d.markets?.[k] == null || num(d.markets[k], 'markets.' + k);
  return d;
}

export function validateWeek(w) {
  /^\d{4}-\d{2}-\d{2}$/.test(w?.start) || fail('week.start');
  str(w, 'label', 'week'); str(w.tension, 'label', 'tension'); tone(w.tension, 'tone', 'tension');
  arr(w, 'ticker', 'week'); w.ticker.forEach((t, i) => { str(t, 'k', `ticker[${i}]`); str(t, 'v', `ticker[${i}]`); });
  arr(w, 'top10', 'week'); w.top10.forEach((t, i) => { const p = `top10[${i}]`; tone(t, 'level', p); ['badge', 'title', 'what', 'why', 'who', 'impact', 'watch'].forEach(k => str(t, k, p)); });
  str(w.bigIdea, 'title', 'bigIdea'); str(w.bigIdea, 'text', 'bigIdea'); arr(w.bigIdea, 'points', 'bigIdea');
  arr(w, 'hypotheses', 'week'); w.hypotheses.forEach((h, i) => { tone(h, 'tone', `hypotheses[${i}]`); str(h, 't', `hypotheses[${i}]`); str(h, 'd', `hypotheses[${i}]`); });
  arr(w, 'stories', 'week'); w.stories.forEach((s, i) => {
    const p = `stories[${i}]`; tone(s, 'level', p);
    ['title', 'date', 'what', 'why', 'whyNow', 'winnersLosers', 'econImpact', 'marketImpact'].forEach(k => str(s, k, p));
    arr(s, 'countries', p); arr(s, 'watch', p); ['base', 'pos', 'neg'].forEach(k => str(s.scenarios, k, p + '.scenarios'));
    Number.isInteger(s.importance) && s.importance >= 1 && s.importance <= 5 || fail(p + '.importance');
  });
  arr(w, 'actors', 'week'); w.actors.forEach((a, i) => ['name', 'block', 'wants', 'fears', 'canDo', 'limits'].forEach(k => str(a, k, `actors[${i}]`)));
  arr(w, 'policy', 'week'); arr(w, 'assets', 'week');
  arr(w.charts, 'markets', 'charts'); w.charts.markets.forEach((m, i) => { str(m, 'key', `markets[${i}]`); str(m, 'label', `markets[${i}]`); num(m.value, `markets[${i}].value`); tone(m, 'tone', `markets[${i}]`); });
  const h = w.charts.hormuz; arr(h, 'labels', 'hormuz'); arr(h, 'series', 'hormuz');
  h.series.forEach((s, i) => { str(s, 'key', `series[${i}]`); s.data?.length === h.labels.length && s.data.every(Number.isFinite) || fail(`series[${i}].data debe tener ${h.labels.length} números`); });
  arr(w, 'chokepoints', 'week'); w.chokepoints.forEach((c, i) => { tone(c, 'tone', `chokepoints[${i}]`); str(c, 'name', `chokepoints[${i}]`); str(c, 'd', `chokepoints[${i}]`); });
  arr(w, 'risks', 'week'); w.risks.forEach((r, i) => { const p = `risks[${i}]`; str(r, 'risk', p); ['probL', 'impL', 'cat', 'exposed', 'signal'].forEach(k => str(r, k, p)); [r.p, r.i].every(v => Number.isFinite(v) && v >= 0 && v <= 100) || fail(p + '.p/.i deben ser 0–100'); });
  arr(w, 'hidden', 'week'); arr(w, 'concepts', 'week');
  return w;
}

export function validateEditorial(e) { ['thesis', 'winners', 'losers', 'outlook'].forEach(k => str(e, k, 'editorial')); return e; }

/* ---------- Un único fichero que lee la web ---------- */
export function build() {
  const weeks = {}, days = {};
  listJSON(path.join(DATA, 'weeks')).forEach(f => { weeks[f.replace('.json', '')] = readJSON(path.join(DATA, 'weeks', f)); });
  listJSON(path.join(DATA, 'days')).slice(-21).forEach(f => { days[f.replace('.json', '')] = readJSON(path.join(DATA, 'days', f)); }); // shortcut: sólo los 21 días más recientes; el histórico queda en data/days
  const ef = path.join(DATA, 'editorial.json');
  writeJSON(path.join(DATA, 'db.json'), { updated: new Date().toISOString(), weeks, days, editorial: fs.existsSync(ef) ? readJSON(ef) : { month: {}, quarter: {}, year: {} } });
}
