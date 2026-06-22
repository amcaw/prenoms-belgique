import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dataDir = resolve(root, 'Statbel_data');

const MIN_TOTAL = 20;
const SOURCE = 'Statbel — Office belge de statistique';
const NOTE =
	'Naissances par prénom et par an en Belgique. Statbel ne publie un prénom qu’à partir de 5 occurrences : un 0 (ou une absence) ne signifie donc pas zéro naissance, mais moins de 5.';

const dirFiles = readdirSync(dataDir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'));
function findFile(re, what) {
	const f = dirFiles.find((x) => re.test(x.normalize('NFC')));
	if (!f) throw new Error(`Fichier ${what} introuvable dans Statbel_data/ (motif ${re})`);
	return resolve(dataDir, f);
}
const FILLES = findFile(/filles/i, 'Filles');
const GARCONS = findFile(/gar[cç]ons?/i, 'Garçons');
const PROV = findFile(/prov/i, 'provinces');

const yearSheets = (wb) => wb.SheetNames.filter((s) => /^\d{4}$/.test(s)).map(Number).sort((a, b) => a - b);
const cumulativeSheet = (wb) => wb.SheetNames.find((s) => /^\d{4}-\d{4}$/.test(s));

function regionKey(label) {
	const s = String(label || '').toLowerCase();
	if (s.includes('brux')) return 'br';
	if (s.includes('fla')) return 'fl';
	if (s.includes('wall')) return 'wa';
	return null;
}

const wbF = XLSX.readFile(FILLES);
const wbM = XLSX.readFile(GARCONS);
const YEARS = [...new Set([...yearSheets(wbF), ...yearSheets(wbM)])].sort((a, b) => a - b);
const YN = YEARS.length;
const yi = Object.fromEntries(YEARS.map((y, i) => [y, i]));

function parseGender(wb) {
	const map = new Map();
	const ensure = (name) => {
		let o = map.get(name);
		if (!o) {
			o = {
				be: new Array(YN).fill(0),
				fl: new Array(YN).fill(0),
				wa: new Array(YN).fill(0),
				br: new Array(YN).fill(0),
				total: 0
			};
			map.set(name, o);
		}
		return o;
	};

	for (const yr of yearSheets(wb)) {
		const ws = wb.Sheets[String(yr)];
		const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
		const header = rows[0] || [];
		const national = String(header[0] || '').toLowerCase().includes('belg');
		const regions = [3, 6, 9].map((c) => ({ c, region: regionKey(header[c]) })).filter((o) => o.region);
		const i = yi[yr];
		for (let r = 1; r < rows.length; r++) {
			const row = rows[r];
			if (!row) continue;
			if (national) {
				const n = row[1], cnt = row[2];
				if (typeof n === 'string' && n.trim() && typeof cnt === 'number' && cnt > 0)
					ensure(n.trim()).be[i] = cnt;
			}
			for (const { c, region } of regions) {
				const n = row[c + 1], cnt = row[c + 2];
				if (typeof n === 'string' && n.trim() && typeof cnt === 'number' && cnt > 0)
					ensure(n.trim())[region][i] = cnt;
			}
		}
	}

	const totalSheet = cumulativeSheet(wb);
	if (totalSheet) {
		const trows = XLSX.utils.sheet_to_json(wb.Sheets[totalSheet], { header: 1 });
		for (let r = 1; r < trows.length; r++) {
			const row = trows[r];
			if (!row) continue;
			const n = row[1], cnt = row[2];
			if (typeof n === 'string' && n.trim() && typeof cnt === 'number') ensure(n.trim()).total = cnt;
		}
	}

	return map;
}

const names = [];
for (const [g, wb] of [['f', wbF], ['m', wbM]]) {
	for (const [n, o] of parseGender(wb)) {
		const t = o.total || o.be.reduce((a, b) => a + b, 0);
		if (t < MIN_TOTAL) continue;
		const v = { be: o.be };
		for (const k of ['fl', 'wa', 'br']) if (o[k].some((x) => x > 0)) v[k] = o[k];
		names.push({ n, g, t, v });
	}
}
names.sort((a, b) => b.t - a.t);

const prenoms = {
	meta: {
		years: YEARS,
		regions: [
			{ key: 'be', label: 'Belgique' },
			{ key: 'fl', label: 'Flandre' },
			{ key: 'wa', label: 'Wallonie' },
			{ key: 'br', label: 'Bruxelles' }
		],
		count: names.length,
		minTotal: MIN_TOTAL,
		source: SOURCE,
		note: NOTE
	},
	names
};

const pwb = XLSX.readFile(PROV);
const PROV_YEARS = [
	...new Set(pwb.SheetNames.map((s) => /^[FM]_PROV(\d{4})$/.exec(s)?.[1]).filter(Boolean).map(Number))
].sort((a, b) => a - b);
const provMeta = new Map();
const provData = { f: {}, m: {} };
for (const G of ['F', 'M']) {
	const gk = G === 'F' ? 'f' : 'm';
	for (const yr of PROV_YEARS) {
		const ws = pwb.Sheets[`${G}_PROV${yr}`];
		if (!ws) continue;
		const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
		const yObj = (provData[gk][yr] = {});
		for (let i = 2; i < rows.length; i++) {
			const row = rows[i];
			if (!row || !row[2]) continue;
			const nuts = row[2];
			const label = row[3];
			const name = row[4];
			const count = row[5];
			if (!provMeta.has(nuts)) provMeta.set(nuts, label);
			if (typeof name === 'string' && typeof count === 'number' && count > 0) {
				let p = yObj[nuts];
				if (!p) p = yObj[nuts] = { total: 0, names: {} };
				p.names[name] = count;
				p.total += count;
			}
		}
	}
}

const provinces = {
	meta: {
		years: PROV_YEARS,
		source: SOURCE,
		provinces: [...provMeta]
			.map(([nuts, label]) => ({ nuts, label }))
			.sort((a, b) => a.nuts.localeCompare(b.nuts))
	},
	data: provData
};

mkdirSync(resolve(root, 'static/data'), { recursive: true });
writeFileSync(resolve(root, 'static/data/prenoms.json'), JSON.stringify(prenoms));
writeFileSync(resolve(root, 'static/data/provinces.json'), JSON.stringify(provinces));
writeFileSync(resolve(root, 'static/data/meta.json'), JSON.stringify({ years: YEARS, provinceYears: PROV_YEARS }));

const kb = (o) => (Buffer.byteLength(JSON.stringify(o)) / 1024).toFixed(0);
const withReg = names.filter((n) => n.v.fl || n.v.wa || n.v.br).length;
console.log(`Années détectées : ${YEARS[0]}–${YEARS.at(-1)} (${YN} ans) · provinces ${PROV_YEARS[0]}–${PROV_YEARS.at(-1)}`);
console.log(`prenoms.json  : ${names.length} prénoms (${withReg} avec régions), ${kb(prenoms)} KB`);
console.log(`provinces.json: ${provinces.meta.provinces.length} provinces, ${kb(provinces)} KB`);
