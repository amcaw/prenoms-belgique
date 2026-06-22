import { base } from '$app/paths';

export type Gender = 'f' | 'm';
export type RegionKey = 'be' | 'fl' | 'wa' | 'br';

export interface Region {
	key: RegionKey;
	label: string;
}

export interface RawName {
	n: string;
	g: Gender;
	t: number;
	v: Partial<Record<RegionKey, number[]>>;
}

export interface DatasetMeta {
	years: number[];
	regions: Region[];
	count: number;
	minTotal: number;
	source: string;
	note: string;
}

export interface NameStat {
	id: string;
	n: string;
	g: Gender;
	t: number;
	series: Record<RegionKey, number[]>;
}

export interface Dataset {
	meta: DatasetMeta;
	names: NameStat[];
	byId: Map<string, NameStat>;
	ranks: Map<string, Record<RegionKey, (number | null)[]>>;
	search: { stat: NameStat; norm: string }[];
}

const REGION_KEYS: RegionKey[] = ['be', 'fl', 'wa', 'br'];

export const idOf = (n: string, g: Gender) => `${n}|${g}`;

export function normalize(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
}

function deriveStat(raw: RawName, yc: number): NameStat {
	const series = {} as Record<RegionKey, number[]>;
	for (const k of REGION_KEYS) series[k] = raw.v[k] ?? new Array(yc).fill(0);
	return { id: idOf(raw.n, raw.g), n: raw.n, g: raw.g, t: raw.t, series };
}

function buildRanks(names: NameStat[], yc: number): Map<string, Record<RegionKey, (number | null)[]>> {
	const ranks = new Map<string, Record<RegionKey, (number | null)[]>>();
	for (const s of names) {
		const rec = {} as Record<RegionKey, (number | null)[]>;
		for (const k of REGION_KEYS) rec[k] = new Array(yc).fill(null);
		ranks.set(s.id, rec);
	}
	for (const region of REGION_KEYS) {
		for (const g of ['f', 'm'] as Gender[]) {
			const pool = names.filter((s) => s.g === g);
			for (let y = 0; y < yc; y++) {
				const ranked = pool
					.filter((s) => s.series[region][y] > 0)
					.sort((a, b) => b.series[region][y] - a.series[region][y]);
				for (let r = 0; r < ranked.length; r++) ranks.get(ranked[r].id)![region][y] = r + 1;
			}
		}
	}
	return ranks;
}

let cached: Promise<Dataset> | null = null;

export function loadDataset(fetchFn: typeof fetch = fetch): Promise<Dataset> {
	if (cached) return cached;
	cached = (async () => {
		const res = await fetchFn(`${base}/data/prenoms.json`);
		if (!res.ok) throw new Error(`Failed to load dataset: ${res.status}`);
		const json = (await res.json()) as { meta: DatasetMeta; names: RawName[] };
		const yc = json.meta.years.length;
		const names = json.names.map((r) => deriveStat(r, yc));
		const byId = new Map(names.map((s) => [s.id, s]));
		const ranks = buildRanks(names, yc);
		const search = names.map((stat) => ({ stat, norm: normalize(stat.n) }));
		return { meta: json.meta, names, byId, ranks, search };
	})();
	return cached;
}

export function searchNames(ds: Dataset, query: string, limit = 12): NameStat[] {
	const q = normalize(query);
	if (!q) return [];
	const prefix: NameStat[] = [];
	const contains: NameStat[] = [];
	for (const { stat, norm } of ds.search) {
		const at = norm.indexOf(q);
		if (at === 0) prefix.push(stat);
		else if (at > 0) contains.push(stat);
	}
	const byTotal = (a: NameStat, b: NameStat) => b.t - a.t;
	prefix.sort(byTotal);
	contains.sort(byTotal);
	return [...prefix, ...contains].slice(0, limit);
}

export interface ModeInfo {
	names: NameStat[];
	avgMode: number;
}

export function topNames(ds: Dataset, gender: Gender, region: RegionKey, count = 10): ModeInfo {
	const pool = ds.names.filter((s) => s.g === gender);
	const yc = ds.meta.years.length;

	const leaders = new Set<string>();
	for (let i = 0; i < yc; i++) {
		let best: NameStat | null = null;
		for (const s of pool) if (!best || s.series[region][i] > best.series[region][i]) best = s;
		if (best && best.series[region][i] > 0) leaders.add(best.id);
	}

	const peakOf = (s: NameStat) => {
		const v = s.series[region];
		let pi = 0;
		for (let k = 1; k < v.length; k++) if (v[k] > v[pi]) pi = k;
		return pi;
	};

	const ranked = pool
		.map((s) => {
			const r = ds.ranks.get(s.id)![region];
			let best = Infinity;
			for (const v of r) if (v !== null && v < best) best = v;
			return { s, best };
		})
		.filter((o) => o.best !== Infinity)
		.sort((a, b) => a.best - b.best || b.s.t - a.s.t)
		.slice(0, count)
		.map((o) => o.s)
		.sort((a, b) => peakOf(a) - peakOf(b));

	return { names: ranked, avgMode: leaders.size ? yc / leaders.size : 0 };
}

export function regionTotals(s: NameStat) {
	const sum = (k: RegionKey) => s.series[k].reduce((a, b) => a + b, 0);
	const fl = sum('fl');
	const wa = sum('wa');
	const br = sum('br');
	return { fl, wa, br, sum: fl + wa + br };
}

export function peakInfo(values: number[]) {
	let idx = 0;
	for (let i = 1; i < values.length; i++) if (values[i] > values[idx]) idx = i;
	return { idx, value: values[idx] };
}

export interface ProvinceMeta {
	years: number[];
	source: string;
	provinces: { nuts: string; label: string }[];
}
export interface ProvinceCell {
	total: number;
	names: Record<string, number>;
}
export type ProvinceYear = Record<string, ProvinceCell>;
export interface ProvinceDataset {
	meta: ProvinceMeta;
	data: { f: Record<string, ProvinceYear>; m: Record<string, ProvinceYear> };
}

let cachedProv: Promise<ProvinceDataset> | null = null;

export function loadProvinces(fetchFn: typeof fetch = fetch): Promise<ProvinceDataset> {
	if (cachedProv) return cachedProv;
	cachedProv = (async () => {
		const res = await fetchFn(`${base}/data/provinces.json`);
		if (!res.ok) throw new Error(`Failed to load provinces: ${res.status}`);
		return (await res.json()) as ProvinceDataset;
	})();
	return cachedProv;
}

export interface AppMeta {
	years: number[];
	provinceYears: number[];
}

let cachedMeta: Promise<AppMeta> | null = null;

export function loadMeta(fetchFn: typeof fetch = fetch): Promise<AppMeta> {
	if (cachedMeta) return cachedMeta;
	cachedMeta = (async () => {
		const res = await fetchFn(`${base}/data/meta.json`);
		if (!res.ok) throw new Error(`Failed to load meta: ${res.status}`);
		return (await res.json()) as AppMeta;
	})();
	return cachedMeta;
}

const FR = new Intl.NumberFormat('fr-FR');
export const fmtInt = (n: number) => FR.format(n);
export const fmtCount = (n: number) => (n === 0 ? '< 5' : FR.format(n));
export const genderLabel = (g: Gender) => (g === 'f' ? 'filles' : 'garçons');
