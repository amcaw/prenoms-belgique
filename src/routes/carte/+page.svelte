<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { base } from '$app/paths';
	import {
		loadDataset,
		loadProvinces,
		idOf,
		fmtInt,
		genderLabel,
		type Dataset,
		type Gender,
		type NameStat,
		type ProvinceDataset
	} from '$lib/data';
	import { colorForIndex } from '$lib/colors';
	import Search from '$lib/components/Search.svelte';
	import MapChart from '$lib/components/MapChart.svelte';

	interface GeoData {
		type: string;
		features: { type: string; properties: { nuts: string; name?: string }; geometry: unknown }[];
	}

	let ds = $state<Dataset | null>(null);
	let prov = $state<ProvinceDataset | null>(null);
	let geo = $state<GeoData | null>(null);
	let loadError = $state<string | null>(null);

	let mode = $state<'top' | 'name'>('top');
	let gender = $state<Gender>('f');
	let year = $state(0);
	let playing = $state(false);
	let active = $state<NameStat | null>(null);

	const selectedIds = $derived(new Set(active ? [active.id] : []));

	function short(label: string) {
		return label.replace(/^Province (d’|de la |de |du |des )?/, '').replace(/^Région de (la )?/, '');
	}

	$effect(() => {
		if (!playing || !prov) return;
		const ys = prov.meta.years;
		const id = setInterval(() => {
			const i = ys.indexOf(year);
			year = ys[(i + 1) % ys.length];
		}, 1100);
		return () => clearInterval(id);
	});

	const view = $derived.by(() => {
		const fills: Record<string, string> = {};
		const labels: Record<string, string> = {};
		const tip: Record<string, { title: string; lines: string[] }> = {};
		const legend: { name: string; color: string; count: number }[] = [];
		let max = 0;
		if (!prov) return { fills, labels, tip, legend, max };

		if (mode === 'top') {
			const yObj = prov.data[gender][String(year)] ?? {};
			const perProv = prov.meta.provinces.map((p) => {
				const cell = yObj[p.nuts];
				const entries = cell
					? (Object.entries(cell.names) as [string, number][]).sort((a, b) => b[1] - a[1])
					: [];
				return { nuts: p.nuts, label: short(p.label), entries };
			});
			const counts = new Map<string, number>();
			for (const pp of perProv) if (pp.entries[0]) counts.set(pp.entries[0][0], (counts.get(pp.entries[0][0]) ?? 0) + 1);
			const distinct = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
			const color = new Map<string, string>();
			distinct.forEach(([n], i) => color.set(n, colorForIndex(i)));
			for (const pp of perProv) {
				if (!pp.entries[0]) continue;
				const top = pp.entries[0][0];
				fills[pp.nuts] = color.get(top)!;
				labels[pp.nuts] = top;
				tip[pp.nuts] = {
					title: pp.label,
					lines: pp.entries.slice(0, 3).map(([n, c], i) => `${i + 1}. ${n} · ${fmtInt(c)}`)
				};
			}
			for (const [name, count] of distinct) legend.push({ name, color: color.get(name)!, count });
			return { fills, labels, tip, legend, max };
		}

		if (active) {
			const yObj = prov.data[active.g][String(year)] ?? {};
			const cells = prov.meta.provinces.map((p) => {
				const cell = yObj[p.nuts];
				const count = cell?.names[active!.n] ?? 0;
				max = Math.max(max, count);
				return { nuts: p.nuts, label: short(p.label), count };
			});
			for (const c of cells) {
				const t = max > 0 ? c.count / max : 0;
				fills[c.nuts] = `color-mix(in srgb, var(--accent) ${Math.round(t * 100)}%, var(--surface-2))`;
				labels[c.nuts] = c.count > 0 ? fmtInt(c.count) : '';
				tip[c.nuts] = {
					title: c.label,
					lines: [`${c.count > 0 ? fmtInt(c.count) : '< 5'} naissances`]
				};
			}
		}
		return { fills, labels, tip, legend, max };
	});

	onMount(async () => {
		try {
			const [d, p, g] = await Promise.all([
				loadDataset(fetch),
				loadProvinces(fetch),
				fetch(`${base}/be-provinces.geojson`).then((r) => r.json())
			]);
			ds = d;
			prov = p;
			geo = g;
			year = p.meta.years.at(-1) ?? 0;
			active = d.byId.get(idOf('Emma', 'f')) ?? d.names[0];
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<div class="page">
	<header>
		<h1>La Belgique des prénoms</h1>
		<p class="sub">
			Le prénom n°1 de chaque province, ou la carte d'un prénom {#if prov}({prov.meta.years[0]}–{prov.meta.years.at(-1)}){/if}.
		</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds || !prov || !geo}
		<p class="loading">Chargement des données…</p>
	{:else}
		<div class="tab-bar mode">
			<button class="tab" class:active={mode === 'top'} onclick={() => (mode = 'top')}>N°1 par province</button>
			<button class="tab" class:active={mode === 'name'} onclick={() => (mode = 'name')}>Carte d'un prénom</button>
		</div>

		<div class="controls">
			{#if mode === 'top'}
				<div class="tab-bar">
					<button class="tab" class:active={gender === 'f'} onclick={() => (gender = 'f')}>Filles</button>
					<button class="tab" class:active={gender === 'm'} onclick={() => (gender = 'm')}>Garçons</button>
				</div>
			{:else}
				<div class="search-wrap"><Search {ds} {selectedIds} onAdd={(s) => (active = s)} /></div>
			{/if}
			<button class="play" onclick={() => (playing = !playing)} aria-label={playing ? 'Pause' : 'Lecture'}>
				{playing ? '⏸' : '▶'}
			</button>
			<label class="year">
				<span class="year-val">{year}</span>
				<input type="range" min={prov.meta.years[0]} max={prov.meta.years.at(-1)} bind:value={year} />
			</label>
		</div>

		{#if mode === 'name' && active}
			<div class="title-row">
				<span class="dot {active.g}"></span>
				<span class="aname">{active.n}</span>
				<span class="ameta">{genderLabel(active.g)} · naissances en {year}</span>
			</div>
		{/if}

		<section class="block">
			<MapChart {geo} fills={view.fills} labels={view.labels} tip={view.tip} />
		</section>

		{#if mode === 'name'}
			<div class="grad">
				<span class="cap">0</span>
				<span class="bar"></span>
				<span class="cap">{fmtInt(view.max)}</span>
			</div>
		{/if}

		<ChartSource extra="Fond de carte : NUTS 2 (Eurostat / GISCO)." />
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 700;
	}
	.sub {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}
	.loading,
	.error {
		color: var(--text-muted);
		font-size: 0.9rem;
		padding: 24px 0;
	}
	.error {
		color: var(--negative);
	}
	.tab-bar {
		display: flex;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 3px;
		gap: 2px;
	}
	.tab-bar.mode {
		align-self: flex-start;
	}
	.tab {
		border: none;
		border-radius: 9px;
		padding: 7px 14px;
		font: 600 0.78rem var(--font);
		color: var(--text-secondary);
		background: transparent;
		cursor: pointer;
	}
	.tab.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.search-wrap {
		flex: 1;
		min-width: 200px;
	}
	.play {
		flex: none;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast);
		cursor: pointer;
	}
	.year {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 170px;
	}
	.year-val {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		min-width: 3em;
	}
	input[type='range'] {
		flex: 1;
		accent-color: var(--accent);
		cursor: pointer;
	}
	.title-row {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		align-self: center;
	}
	.dot.f {
		background: var(--gender-f);
	}
	.dot.m {
		background: var(--gender-m);
	}
	.aname {
		font-size: 1.2rem;
		font-weight: 700;
	}
	.ameta {
		color: var(--text-muted);
		font-size: 0.82rem;
	}
	.block {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 12px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		font: 600 0.8rem var(--font);
	}
	.sw {
		width: 11px;
		height: 11px;
		border-radius: 50%;
	}
	.n {
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.grad {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.72rem;
		color: var(--text-muted);
	}
	.bar {
		flex: 1;
		max-width: 240px;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(to right, var(--surface-2), var(--accent));
		border: 1px solid var(--border);
	}
	.cap {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
