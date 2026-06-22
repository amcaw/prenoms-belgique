import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(root, 'Statbel_data');

const REGIONS = [['be', 'Belgique'], ['fl', 'Flandre'], ['wa', 'Wallonie'], ['br', 'Bruxelles']];
const REG_LABEL = Object.fromEntries(REGIONS);

const letters = (s) => [...String(s).replace(/[^A-Za-zÀ-ÿ]/g, '')].length;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const pct = (x, t) => (t ? (100 * x) / t : 0);
const r1 = (x) => Math.round(x * 10) / 10;
const fmt = (n) => Math.round(n).toLocaleString('fr-BE').replace(/ | /g, ' ');

const dirFiles = readdirSync(dataDir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'));
const findFile = (re) => {
	const f = dirFiles.find((x) => re.test(x.normalize('NFC')));
	if (!f) throw new Error(`Fichier introuvable dans Statbel_data/ (${re})`);
	return resolve(dataDir, f);
};
function regionKey(label) {
	const s = String(label || '').toLowerCase();
	if (s.includes('brux')) return 'br';
	if (s.includes('fla')) return 'fl';
	if (s.includes('wall')) return 'wa';
	return null;
}
const yearSheets = (wb) => wb.SheetNames.filter((s) => /^\d{4}$/.test(s)).map(Number).sort((a, b) => a - b);
const cumulativeSheet = (wb) => wb.SheetNames.find((s) => /^\d{4}-\d{4}$/.test(s));

const wbF = XLSX.readFile(findFile(/filles/i));
const wbM = XLSX.readFile(findFile(/gar[cç]ons?/i));
const YEARS = [...new Set([...yearSheets(wbF), ...yearSheets(wbM)])].sort((a, b) => a - b);
const YN = YEARS.length;
const yidx = Object.fromEntries(YEARS.map((y, i) => [y, i]));
const idx = (yr) => yidx[yr];

function parseGenderFull(wb) {
	const perYear = YEARS.map(() => ({ fl: new Map(), wa: new Map(), br: new Map() }));
	const beSeries = new Map();
	const beTotal = new Map();
	for (const yr of yearSheets(wb)) {
		const rows = XLSX.utils.sheet_to_json(wb.Sheets[String(yr)], { header: 1 });
		const header = rows[0] || [];
		const national = String(header[0] || '').toLowerCase().includes('belg');
		const groups = [3, 6, 9].map((c) => ({ c, region: regionKey(header[c]) })).filter((o) => o.region);
		const i = yidx[yr];
		for (let r = 1; r < rows.length; r++) {
			const row = rows[r];
			if (!row) continue;
			if (national) {
				const n = row[1], cnt = row[2];
				if (typeof n === 'string' && n.trim() && typeof cnt === 'number' && cnt > 0) {
					const nm = n.trim();
					if (!beSeries.has(nm)) beSeries.set(nm, new Array(YN).fill(0));
					beSeries.get(nm)[i] = cnt;
				}
			}
			for (const { c, region } of groups) {
				const n = row[c + 1], cnt = row[c + 2];
				if (typeof n === 'string' && n.trim() && typeof cnt === 'number' && cnt > 0)
					perYear[i][region].set(n.trim(), cnt);
			}
		}
	}
	const ts = cumulativeSheet(wb);
	if (ts) {
		const trows = XLSX.utils.sheet_to_json(wb.Sheets[ts], { header: 1 });
		for (let r = 1; r < trows.length; r++) {
			const row = trows[r];
			if (!row) continue;
			const n = row[1], cnt = row[2];
			if (typeof n === 'string' && n.trim() && typeof cnt === 'number') beTotal.set(n.trim(), cnt);
		}
	}
	return { perYear, beSeries, beTotal };
}
const pf = parseGenderFull(wbF), pm = parseGenderFull(wbM);
const regBy = { f: pf.perYear, m: pm.perYear };
const allNat = [];
for (const [g, p] of [['f', pf], ['m', pm]])
	for (const [n, be] of p.beSeries)
		allNat.push({ n, g, be, t: p.beTotal.get(n) ?? sum(be) });

function regionData(region, g) {
	const nameSeries = new Map();
	let years;
	if (region === 'be') {
		const arr = allNat.filter((o) => o.g === g);
		for (const o of arr) nameSeries.set(o.n, o.be);
		years = YEARS.map((_, y) => {
			const map = new Map();
			for (const o of arr) if (o.be[y] > 0) map.set(o.n, o.be[y]);
			return { map, counts: [...map.values()].sort((a, b) => b - a) };
		});
	} else {
		const reg = regBy[g];
		years = reg.map((perY, y) => {
			const map = perY[region];
			for (const [n, v] of map) {
				if (!nameSeries.has(n)) nameSeries.set(n, new Array(YN).fill(0));
				nameSeries.get(n)[y] = v;
			}
			return { map, counts: [...map.values()].sort((a, b) => b - a) };
		});
	}
	return { nameSeries, years };
}

function aggMetrics(rd, region, g) {
	const arr = [...rd.nameSeries.entries()];
	return rd.years.map(({ counts, map }, y) => {
		const tot = sum(counts);
		const distinct = counts.length;
		const top1 = counts[0] || 0;
		const top10 = sum(counts.slice(0, 10));
		let cum = 0, n50 = 0;
		for (const v of counts) { cum += v; n50++; if (cum >= tot / 2) break; }
		let H = 0;
		for (const v of counts) { const p = v / tot; H -= p * Math.log2(p); }
		let wl = 0;
		for (const [n, v] of map) wl += v * letters(n);
		return { tot, distinct, top1, top10, n50, eff: Math.pow(2, H), wlen: wl / tot };
	});
}
function leaderSeq(rd) {
	const segs = [];
	let cur = null;
	rd.years.forEach(({ map }, y) => {
		let best = null;
		for (const [n, v] of map) if (!best || v > best.v) best = { n, v };
		const name = best ? best.n : '—';
		if (cur && cur.n === name) cur.years.push(YEARS[y]);
		else { cur = { n: name, years: [YEARS[y]] }; segs.push(cur); }
	});
	return segs;
}
function movers(rd, minTot, minEnd) {
	const early = [0, 1, 2, 3, 4], late = [25, 26, 27, 28, 29];
	const out = [];
	for (const [n, s] of rd.nameSeries) {
		const t = sum(s);
		if (t < minTot) continue;
		const a = sum(early.map((y) => s[y])) / 5, b = sum(late.map((y) => s[y])) / 5;
		out.push({ n, a, b, d: b - a });
	}
	const risers = out.filter((o) => o.b >= minEnd).sort((x, y) => y.d - x.d).slice(0, 6);
	const fallers = out.filter((o) => o.a >= minEnd).sort((x, y) => x.d - y.d).slice(0, 6);
	return { risers, fallers };
}
function fads(rd, peakMin) {
	const out = [];
	for (const [n, s] of rd.nameSeries) {
		let peak = 0, py = 0;
		s.forEach((v, y) => { if (v > peak) { peak = v; py = YEARS[y]; } });
		const start = (s[0] + s[1]) / 2, last = s[29];
		if (start <= 0.45 * peak && last <= 0.2 * peak && py >= 1999 && py <= 2019 && peak >= peakMin)
			out.push({ n, peak, py, last, start });
	}
	return out.sort((a, b) => b.peak - a.peak).slice(0, 10);
}
function mixedFor(region, minTot, minShare) {
	const map = new Map();
	for (const g of ['f', 'm']) {
		const rd = regionData(region, g);
		for (const [n, s] of rd.nameSeries) {
			const e = map.get(n) || { n, f: 0, m: 0 };
			e[g] += sum(s);
			map.set(n, e);
		}
	}
	return [...map.values()]
		.map((e) => ({ ...e, t: e.f + e.m, min: Math.min(e.f, e.m) }))
		.filter((e) => e.t >= minTot && e.min / e.t >= minShare)
		.sort((a, b) => b.min - a.min)
		.slice(0, 10);
}

const RD = {};
for (const [rk] of REGIONS) RD[rk] = { f: regionData(rk, 'f'), m: regionData(rk, 'm') };
const AGG = {};
for (const [rk] of REGIONS) AGG[rk] = { f: aggMetrics(RD[rk].f), m: aggMetrics(RD[rk].m) };

function regTotals(g) {
	const map = new Map();
	const tot = { fl: 0, wa: 0, br: 0 };
	for (const k of ['fl', 'wa', 'br']) {
		for (const [n, s] of RD[k][g].nameSeries) {
			const t = sum(s);
			const e = map.get(n) || { n, fl: 0, wa: 0, br: 0 };
			e[k] += t; map.set(n, e); tot[k] += t;
		}
	}
	return { map, tot };
}
function signatures(g) {
	const { map, tot } = regTotals(g);
	const grand = tot.fl + tot.wa + tot.br;
	const share = { fl: tot.fl / grand, wa: tot.wa / grand, br: tot.br / grand };
	const out = { fl: [], wa: [], br: [] };
	for (const e of map.values()) {
		const t = e.fl + e.wa + e.br;
		if (t < 800) continue;
		for (const k of ['fl', 'wa', 'br']) {
			const p = e[k] / t;
			if (p / share[k] >= 1.3 && p >= 0.45) out[k].push({ n: e.n, t, p });
		}
	}
	for (const k of ['fl', 'wa', 'br']) out[k] = out[k].sort((a, b) => b.t - a.t).slice(0, 8);
	return { out, share };
}
function jaccard(g, a, b, topN, y) {
	const top = (m) => new Set([...m.entries()].sort((x, z) => z[1] - x[1]).slice(0, topN).map((e) => e[0]));
	const A = top(RD[a][g].years[y].map), B = top(RD[b][g].years[y].map);
	let inter = 0;
	for (const x of A) if (B.has(x)) inter++;
	return inter / (A.size + B.size - inter);
}
const avgJ = (g, a, b) => r1(100 * sum(YEARS.map((_, y) => jaccard(g, a, b, 20, y))) / YN);

const pwb = XLSX.readFile(resolve(dataDir, 'Firstnames_PROV_STATBEL_2017-fr.xlsx'));
const PROV_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const provMeta = new Map();
const prov = { f: {}, m: {} };
for (const G of ['F', 'M']) {
	const gk = G === 'F' ? 'f' : 'm';
	for (const yr of PROV_YEARS) {
		const ws = pwb.Sheets[`${G}_PROV${yr}`];
		if (!ws) continue;
		const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
		for (let i = 2; i < rows.length; i++) {
			const row = rows[i];
			if (!row || !row[2]) continue;
			const nuts = row[2], label = row[3], name = row[4], count = row[5];
			provMeta.set(nuts, label);
			if (typeof name === 'string' && typeof count === 'number' && count > 0) {
				(prov[gk][nuts] ??= new Map());
				prov[gk][nuts].set(name, (prov[gk][nuts].get(name) || 0) + count);
			}
		}
	}
}
function provLeaders(gk) {
	const out = [];
	for (const [nuts, label] of provMeta) {
		const m = prov[gk][nuts];
		if (!m) continue;
		const top = [...m.entries()].sort((a, b) => b[1] - a[1]);
		const tot = sum([...m.values()]);
		out.push({ nuts, label, n: top[0][0], v: top[0][1], distinct: m.size, tot, share: top[0][1] / tot });
	}
	return out.sort((a, b) => a.label.localeCompare(b.label));
}

const tbl = (head, rows) => `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;
const nameList = (list, withDelta) => list.map((o) => withDelta ? `${o.n} (${o.d >= 0 ? '+' : ''}${fmt(o.d)})` : `${o.n} (${o.py})`).join(', ');

let md = '';
const P = (s = '') => (md += s + '\n');

P('# Prénoms en Belgique (1995–2024) — analyse des données Statbel');
P();
P(`> Analyse générée à partir des fichiers bruts de \`Statbel_data/\` : séries Filles/Garçons ${YEARS[0]}–${YEARS.at(-1)} (colonne nationale « Belgique », colonnes Flandre/Wallonie/Bruxelles et feuille des totaux cumulés) et répartition provinciale ${PROV_YEARS[0]}–${PROV_YEARS.at(-1)}. **Chaque section décline les quatre territoires : Belgique (global), Flandre, Wallonie et Bruxelles.**`);
P('>');
P('> **Deux règles de lecture.**');
P('> 1. **Seuil des 5.** Statbel ne publie un prénom qu’à partir de **5 occurrences** une année donnée. Une absence ou un « 0 » ne signifie pas *personne*, mais *moins de 5*. Les totaux portent sur les **naissances nommées (≥ 5)**.');
P('> 2. **Troncature régionale.** Les listes régionales annuelles ne contiennent que les prénoms les plus fréquents (quelques centaines à ~1 000 par région) ; elles couvrent ≈ 94 % des naissances nommées. Les agrégats Flandre/Wallonie/Bruxelles sont donc de légers *minorants*, alors que la colonne Belgique est complète. Les comparaisons de tendance restent fiables.');
P();
P('---');
P();

P('## 1. Le décrochage de la natalité, territoire par territoire');
P();
P('Naissances nommées (filles + garçons) par an :');
P();
const totReg = (rk, y) => AGG[rk].f[y].tot + AGG[rk].m[y].tot;
P(tbl(['Année', ...REGIONS.map(([, l]) => l)], [1995, 2000, 2005, 2010, 2015, 2020, 2024].map((yr) =>
	[yr, ...REGIONS.map(([rk]) => fmt(totReg(rk, idx(yr))))]
)));
P();
P('Évolution 1995 → 2024 (et pic intermédiaire) :');
P();
P(tbl(['Territoire', '1995', '2024', 'Δ', 'Pic'], REGIONS.map(([rk, l]) => {
	let pk = 0, py = 0;
	YEARS.forEach((yr, y) => { const t = totReg(rk, y); if (t > pk) { pk = t; py = yr; } });
	const a = totReg(rk, 0), b = totReg(rk, 29);
	return [l, fmt(a), fmt(b), `${b - a >= 0 ? '+' : ''}${r1(pct(b - a, a))} %`, `${fmt(pk)} (${py})`];
})));
P();
P('- La **Flandre** (≈ 57 % des naissances) et la **Wallonie** (≈ 33 %) suivent la même courbe : sommet vers 2008–2010 puis recul marqué jusqu’en 2024.');
P('- **Bruxelles** (≈ 10 %) se distingue : sa natalité a beaucoup moins reculé, soutenue par une population plus jeune et plus d’arrivées — la Région reste un réservoir de diversité de prénoms.');
P('- À l’échelle **belge**, on perd près d’un sixième des naissances nommées en une génération.');
P();

P('## 2. L’individualisation : les prénoms se dispersent partout');
P();
P('Le prénom n°1 et le top 10 pèsent une part décroissante des naissances, dans les quatre territoires. Le *nombre effectif de prénoms* (2^entropie) mesure la dispersion : plus il est haut, plus les naissances sont éparpillées.');
P();
for (const g of ['f', 'm']) {
	P(`### ${g === 'f' ? '2a. Filles' : '2b. Garçons'}`);
	P(tbl(['Territoire', 'Part n°1 (1995)', 'Part n°1 (2024)', 'Part top 10 (2024)', 'Nb effectif (1995 → 2024)'], REGIONS.map(([rk, l]) => {
		const a = AGG[rk][g][0], b = AGG[rk][g][29];
		return [l, `${r1(pct(a.top1, a.tot))} %`, `${r1(pct(b.top1, b.tot))} %`, `${r1(pct(b.top10, b.tot))} %`, `${fmt(a.eff)} → ${fmt(b.eff)}`];
	})));
	P();
}
P('- La dispersion progresse partout, mais **Bruxelles** est structurellement la plus diverse (nombre effectif le plus élevé) : aucune mode n’y domine, reflet de sa mosaïque culturelle.');
P('- Les **garçons** restent un cran plus concentrés que les filles dans chaque région (le n°1 masculin pèse plus lourd), mais l’écart se referme.');
P('- En **Flandre**, la concentration de tête reste un peu plus forte qu’en Wallonie : les modes flamandes sont plus « grégaires » (cf. § feux de paille).');
P();

P('## 3. La taille des prénoms : le grand raccourcissement');
P();
P('Longueur moyenne en lettres, pondérée par les naissances :');
P();
P(tbl(['Territoire', 'Filles 1995', 'Filles 2024', 'Garçons 1995', 'Garçons 2024'], REGIONS.map(([rk, l]) =>
	[l, r1(AGG[rk].f[0].wlen), r1(AGG[rk].f[29].wlen), r1(AGG[rk].m[0].wlen), r1(AGG[rk].m[29].wlen)]
)));
P();
P('- Le raccourcissement est général (vague des Lou, Mia, Noa, Léa, Tom, Sam, Liam).');
P('- La **Flandre** a les prénoms les plus courts (forte densité de prénoms en 4–5 lettres : Stan, Vince, Lars, Fien, Lore).');
P('- La **Wallonie** et **Bruxelles** gardent des prénoms un peu plus longs (terminaisons -ine, -elle, -ette côté filles ; prénoms arabo-musulmans côté Bruxelles).');
P();

P('## 4. Les n°1 : règnes et successions, par territoire');
P();
for (const g of ['f', 'm']) {
	P(`### ${g === 'f' ? 'Filles' : 'Garçons'}`);
	for (const [rk, l] of REGIONS) {
		const seq = leaderSeq(RD[rk][g]).map((s) => `${s.n} (${s.years[0]}${s.years.length > 1 ? '–' + s.years.at(-1) : ''})`).join(' → ');
		P(`- **${l}** : ${seq}`);
	}
	P();
}
const top1Name = (rk, g, y) => [...RD[rk][g].years[y].map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
let sameF = 0, sameM = 0;
for (let y = 0; y < YN; y++) {
	const f = ['fl', 'wa', 'br'].map((k) => top1Name(k, 'f', y));
	const m = ['fl', 'wa', 'br'].map((k) => top1Name(k, 'm', y));
	if (f[0] && f[0] === f[1] && f[1] === f[2]) sameF++;
	if (m[0] && m[0] === m[1] && m[1] === m[2]) sameM++;
}
P(`> Sur 30 ans, les trois régions n’ont eu **le même prénom n°1** que **${sameF} année(s) côté filles** et **${sameM} côté garçons**. La Belgique « moyenne » masque trois pays de prénoms.`);
P();

P('## 5. Ascensions et chutes (moyenne 1995–1999 → 2020–2024)');
P();
for (const g of ['f', 'm']) {
	P(`### ${g === 'f' ? 'Filles' : 'Garçons'}`);
	for (const [rk, l] of REGIONS) {
		const m = movers(RD[rk][g], rk === 'be' ? 300 : 150, rk === 'be' ? 60 : 30);
		P(`- **${l}** — ▲ ${nameList(m.risers, true)}`);
		P(`- **${l}** — ▼ ${nameList(m.fallers, true)}`);
	}
	P();
}
P('- Hausses partagées : **Olivia, Mila, Lina, Sofia** (filles) ; **Noah, Adam, Jules, Gabriel, Arthur** (garçons) montent dans presque tous les territoires.');
P('- Chutes communes : la génération **Laura/Sarah/Julie** et **Thomas/Nicolas/Kevin/Dylan** s’effondre partout — ces prénoms très « années 90 » datent fortement une personne.');
P();

P('## 6. Les feux de paille (montée et chute entièrement visibles)');
P();
P('Prénoms discrets en 1995, sommet net au milieu de la période, retombés sous un cinquième du pic en 2024 (entre parenthèses : l’année du pic) :');
P();
for (const g of ['f', 'm']) {
	P(`### ${g === 'f' ? 'Filles' : 'Garçons'}`);
	for (const [rk, l] of REGIONS) {
		const f = fads(RD[rk][g], rk === 'be' ? 150 : 60);
		P(`- **${l}** : ${f.length ? nameList(f, false) : '— (aucun pic franc isolé sur la période)'}`);
	}
	P();
}
P('- Phénomène **massivement flamand** : Amber, Britt, Femke, Merel (filles) ; Robbe, Senne, Wout, Seppe, Xander, Daan (garçons). Les modes néerlandophones montent et retombent par vagues serrées et synchronisées.');
P('- Côté francophone, les bascules sont plus lentes ; Bruxelles voit surtout émerger (Nour, Rania, Aya) plus que retomber.');
P();

P('## 7. Trois cultures de prénoms : le grand écart régional');
P();
const sigF = signatures('f'), sigM = signatures('m');
P(`Poids dans les naissances nommées : Flandre ${r1(sigF.share.fl * 100)} %, Wallonie ${r1(sigF.share.wa * 100)} %, Bruxelles ${r1(sigF.share.br * 100)} %.`);
P();
P('### 7a. Distance entre régions (recouvrement du top 20, indice de Jaccard moyen)');
P(tbl(['Paire', 'Filles', 'Garçons'], [['fl', 'wa'], ['fl', 'br'], ['wa', 'br']].map(([a, b]) =>
	[`${REG_LABEL[a]} ↔ ${REG_LABEL[b]}`, `${avgJ('f', a, b)} %`, `${avgJ('m', a, b)} %`]
)));
P();
P('- La **Flandre** partage très peu de prénoms de tête avec le Sud (univers néerlandophone).');
P('- **Bruxelles** s’éloigne des deux autres par sa forte présence de prénoms arabo-musulmans dès les années 1990.');
P();
P('### 7b. Prénoms emblématiques de chaque région');
for (const [k, l] of [['fl', 'Flandre'], ['wa', 'Wallonie'], ['br', 'Bruxelles']]) {
	P(`- **${l}** — Filles : ${sigF.out[k].map((o) => o.n).join(', ')}`);
	P(`- **${l}** — Garçons : ${sigM.out[k].map((o) => o.n).join(', ')}`);
}
P();
P('*(« Belgique » n’a pas de signature propre : c’est par construction la somme des trois.)*');
P();

P('## 8. La carte fine : les 11 provinces (2017–2024)');
P();
const plF = provLeaders('f'), plM = provLeaders('m');
P('Prénom n°1 cumulé 2017–2024 par province (rattachée à sa région) :');
P();
const nutsRegion = (label) => /wallon|hainaut|liège|luxembourg|namur/i.test(label) ? 'Wallonie' : /bruxelles/i.test(label) ? 'Bruxelles' : 'Flandre';
P(tbl(['Province', 'Région', 'Filles n°1', 'Garçons n°1', 'Prénoms distincts (F)'], plF.map((p) => {
	const m = plM.find((x) => x.nuts === p.nuts);
	return [p.label.replace('Province ', '').replace(/^d[’']/, '').replace('de ', ''), nutsRegion(p.label), p.n, m?.n ?? '—', fmt(p.distinct)];
})));
P();
const mostDiv = [...plF].sort((a, b) => b.distinct - a.distinct)[0];
P(`- Province la plus **diverse** (filles) : **${mostDiv.label}** (${fmt(mostDiv.distinct)} prénoms distincts).`);
P('- **Flandre** : n°1 partagés Olivia / Noah, sauf le Limbourg (Ella) et la Flandre occidentale (Arthur).');
P('- **Wallonie** : Gabriel domine au Sud, Arthur en Brabant wallon ; côté filles Olivia / Emma / Alice.');
P('- **Bruxelles** : seule province où Sofia et Adam arrivent en tête — signature multiculturelle nette.');
P();

P('## 9. Prénoms mixtes, par territoire');
P();
P('Prénoms donnés aux deux sexes de façon significative (part du sexe minoritaire ≥ 15 %) :');
P();
for (const [rk, l] of REGIONS) {
	const mx = mixedFor(rk, rk === 'be' ? 400 : 120, 0.15);
	P(`- **${l}** : ${mx.map((e) => `${e.n} (${r1(pct(e.min, e.t))} %)`).join(', ')}`);
}
P();
P('- Les prénoms unisexes courts dominent : **Noa, Lou, Charlie, Sasha, Lio**. La Flandre y ajoute des formes propres (Jente, Rune, Bo), la Wallonie/Bruxelles des formes francophones (Noé, Eden, Andrea).');
P();

P('## 10. Ce que les données ne disent pas (limites)');
P();
P('- **Seuil des 5 occurrences** : toute la longue traîne est invisible ; on ne peut jamais affirmer qu’un prénom n’a *jamais* été donné, seulement qu’il est resté sous 5 cette année-là. Cette zone d’ombre grandit avec l’individualisation.');
P('- **Antériorité** : les séries commencent en **1995**. Pour une personne née avant, on ne voit que la queue de la vague de son prénom.');
P('- **Provinces** : disponibles seulement depuis **2017** (8 années) — géographie *récente*, pas historique.');
P('- **Troncature régionale** : listes régionales limitées aux prénoms fréquents (≈ 94 % des naissances) ; les agrégats Flandre/Wallonie/Bruxelles sont de légers minorants.');
P('- **Prénom usuel uniquement** : seconds prénoms et composés non dépliés.');
P();
P('---');
P('*Sources : Statbel — Office belge de statistique. National & régional 1995–2024, provincial 2017–2024. Généré par `scripts/analyze.mjs`.*');

writeFileSync(resolve(root, 'docs/analyse-donnees-statbel.md'), md);
console.log('written docs/analyse-donnees-statbel.md (' + md.length + ' chars)');
console.log('sameF', sameF, 'sameM', sameM);
