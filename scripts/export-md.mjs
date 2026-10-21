// Vista legible de los datos: data/days (JSON, fuente de verdad) -> content/diarios/*.md, y content/index.json.
// Los semanales los sube el usuario a mano a content/semanales/semana-WW-AAAA.md: aquí sólo se INDEXAN, nunca se escriben.
// Uso: node scripts/export-md.mjs   (run.mjs lo llama solo tras build()). Idempotente: sólo reescribe lo que cambia.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJSON, listJSON, isoWeek, parse, iso, addDays, weekLabel } from './lib.mjs';

const CONTENT = process.env.CONTENT_DIR || path.join(DATA, '..', 'content');

/* ---------- Utilidades de texto ---------- */
const one = s => String(s ?? '').replace(/\s+/g, ' ').trim();
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

// Lunes de la semana ISO `week` del año `year` (el 4 de enero siempre cae en la semana 1)
const mondayOf = (year, week) => { const j4 = new Date(Date.UTC(year, 0, 4)); return addDays(j4, -((j4.getUTCDay() + 6) % 7) + (week - 1) * 7); };

/* ---------- Exportación ---------- */
export function exportMd() {
  const idx = { diarios: [], semanales: [] };
  for (const f of listJSON(path.join(DATA, 'days'))) {
    const d = readJSON(path.join(DATA, 'days', f));
    writeIfChanged(path.join(CONTENT, 'diarios', d.date + '.md'), dayMd(d));
    idx.diarios.push({ date: d.date, label: fecha(d.date), week: isoWeek(parse(d.date)).key, items: d.items.length, file: `content/diarios/${d.date}.md` });
  }
  const wdir = path.join(CONTENT, 'semanales');
  for (const f of fs.existsSync(wdir) ? fs.readdirSync(wdir) : []) {
    const m = /^semana-(\d{2})-(\d{4})\.md$/.exec(f); // cualquier otro nombre se ignora
    if (!m || +m[1] < 1 || +m[1] > 53) continue;
    const week = +m[1], start = mondayOf(+m[2], week), title = /^#\s+(.+)$/m.exec(fs.readFileSync(path.join(wdir, f), 'utf8'))?.[1];
    idx.semanales.push({ slug: f.slice(0, -3), week, year: +m[2], label: weekLabel({ week, start: iso(start), end: iso(addDays(start, 6)) }), start: iso(start), title: one(title), file: `content/semanales/${f}` });
  }
  idx.diarios.sort((a, b) => b.date.localeCompare(a.date));
  idx.semanales.sort((a, b) => b.start.localeCompare(a.start));
  writeIfChanged(path.join(CONTENT, 'index.json'), JSON.stringify(idx, null, 1) + '\n'); // sin fecha de generación: así no hay commits vacíos
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) exportMd();
