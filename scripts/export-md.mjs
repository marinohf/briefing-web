// Vista legible de los datos: data/ (JSON, fuente de verdad) -> content/diarios/*.md, content/semanales/*.md y content/index.json.
// Uso: node scripts/export-md.mjs   (run.mjs lo llama solo tras build()). Idempotente: sólo reescribe lo que cambia.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJSON, listJSON, isoWeek, parse } from './lib.mjs';

const CONTENT = process.env.CONTENT_DIR || path.join(DATA, '..', 'content');

/* ---------- Utilidades de texto ---------- */
const one = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const cell = s => one(s).replace(/\|/g, '\\|');
const fecha = d => parse(d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fm = o => '---\n' + Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${one(v)}`).join('\n') + '\n---\n\n';
// Sólo enlaces http(s); los paréntesis y espacios de la URL se escapan para no romper el Markdown
const link = s => /^https?:\/\//i.test(s?.url) ? `[${one(s.title || s.url).replace(/[[\]]/g, '')}](${s.url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20')})` : null;
const links = l => (l || []).map(link).filter(Boolean);
const srcInline = l => links(l).length ? `\n\n**Fuentes:** ${links(l).join(' · ')}` : '';
const srcList = l => links(l).length ? '\n\n## Fuentes\n\n' + links(l).map(s => '- ' + s).join('\n') : '';
const aiMd = l => (l?.length ? '\n\n## Inteligencia artificial\n\n' + l.map(a => `### ${one(a.title)}\n\n${a.tag ? `*${one(a.tag)}*\n\n` : ''}${one(a.summary)}${a.why ? `\n\n**Por qué importa:** ${one(a.why)}` : ''}${srcInline(a.sources)}`).join('\n\n') : '');
const table = (head, rows) => `\n\n| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n` + rows.map(r => `| ${r.join(' | ')} |`).join('\n');

function writeIfChanged(f, s) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s) fs.writeFileSync(f, s);
}

/* ---------- Plantillas ---------- */
const dayMd = d => {
  const items = [...d.items].sort((a, b) => b.importance - a.importance), m = d.markets || {};
  const mk = [['Brent', m.brent, 'USD/barril'], ['WTI', m.wti, 'USD/barril'], ['Gas TTF', m.ttf, 'EUR/MWh'], ['Bono EE. UU. 10 años', m.us10y, '%']].filter(x => x[1] != null);
  return fm({ tipo: 'diario', fecha: d.date, semana: isoWeek(parse(d.date)).key, noticias: items.length }) +
    `# Briefing diario — ${fecha(d.date)}\n\n## Noticias clave\n\n` +
    items.map(i => `### ${one(i.title)}\n\nImportancia ${i.importance}/5 · ${one(i.source)}${i.region ? ' · ' + one(i.region) : ''}\n\n${one(i.summary)}`).join('\n\n') +
    aiMd(d.ai) +
    (mk.length ? '\n\n## Mercados' + table(['Activo', 'Último cierre', 'Unidad'], mk.map(([k, v, u]) => [k, v, u])) : '') +
    srcList(d.sources) + '\n';
};

const weekMd = (w, key) => {
  const mk = w.charts?.markets || [];
  return fm({ tipo: 'semanal', semana: key, inicio: w.start, tension: w.tension.label }) +
    `# ${one(w.label)}\n\n**Tensión de suministro:** ${one(w.tension.label)}\n\n## ${one(w.bigIdea.title)}\n\n${one(w.bigIdea.text)}\n\n` +
    w.bigIdea.points.map(p => `- **${one(p.b)}** ${one(p.t)}`).join('\n') +
    '\n\n## Claves de la semana\n\n' +
    w.top10.map(t => `### ${t.id}. ${one(t.title)}\n\n*${one(t.badge)}*\n\n**Qué:** ${one(t.what)}\n\n**Por qué:** ${one(t.why)}\n\n**Quién:** ${one(t.who)}\n\n**Consecuencia:** ${one(t.impact)}\n\n**Vigilar:** ${one(t.watch)}${srcInline(t.sources)}`).join('\n\n') +
    aiMd(w.ai) +
    '\n\n## Riesgos' + table(['Riesgo', 'Probabilidad', 'Impacto', 'Catalizador'], w.risks.map(r => [cell(r.risk), cell(r.probL), cell(r.impL), cell(r.cat)])) +
    '\n\n## Hipótesis para la próxima semana\n\n' + w.hypotheses.map(h => `- **${one(h.t)}** ${one(h.d)}`).join('\n') +
    (mk.length ? '\n\n## Cifras' + table(['Activo', 'Valor', 'Unidad'], mk.map(m => [cell(m.label), m.value, cell(m.unit)])) : '') + '\n';
};

/* ---------- Exportación ---------- */
export function exportMd() {
  const idx = { diarios: [], semanales: [] }, bySlug = new Map();
  for (const f of listJSON(path.join(DATA, 'days'))) {
    const d = readJSON(path.join(DATA, 'days', f));
    writeIfChanged(path.join(CONTENT, 'diarios', d.date + '.md'), dayMd(d));
    idx.diarios.push({ date: d.date, label: fecha(d.date), week: isoWeek(parse(d.date)).key, items: d.items.length, file: `content/diarios/${d.date}.md` });
  }
  for (const f of listJSON(path.join(DATA, 'weeks'))) {
    const key = f.replace('.json', ''), m = /^(\d{4})-W(\d{2})/.exec(key); // acepta variantes como 2026-W42b
    if (!m) continue;
    const w = readJSON(path.join(DATA, 'weeks', f)), slug = `semana-${m[2]}-${m[1]}`;
    writeIfChanged(path.join(CONTENT, 'semanales', slug + '.md'), weekMd(w, key));
    bySlug.set(slug, { slug, key, label: w.label, start: w.start, tension: w.tension.label, tone: w.tension.tone, file: `content/semanales/${slug}.md` }); // shortcut: si dos claves dan el mismo slug (W42 y W42b) gana la última; unificar si se repite
  }
  idx.diarios.sort((a, b) => b.date.localeCompare(a.date));
  idx.semanales = [...bySlug.values()].sort((a, b) => b.start.localeCompare(a.start) || b.key.localeCompare(a.key));
  writeIfChanged(path.join(CONTENT, 'index.json'), JSON.stringify(idx, null, 1) + '\n'); // sin fecha de generación: así no hay commits vacíos
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) exportMd();
