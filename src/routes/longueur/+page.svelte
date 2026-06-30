<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, type Dataset, type Gender, type RegionKey } from '$lib/data';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import type { ChartSeries } from '$lib/components/TrendChart.svelte';
	import RegionTabs from '$lib/components/RegionTabs.svelte';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let gender = $state<Gender>('f');
	let region = $state<RegionKey>('be');
	let year = $state(0);

	const years = $derived(ds ? ds.meta.years : []);
	const REGION_COLORS: Record<RegionKey, string> = {
		be: 'var(--series-1)',
		fl: 'var(--series-4)',
		wa: 'var(--series-0)',
		br: 'var(--series-3)'
	};

	const avgSeries = $derived.by<ChartSeries[]>(() => {
		if (!ds) return [];
		const pool = ds.names.filter((s) => s.g === gender);
		return ds.meta.regions.map((reg) => {
			const values = years.map((_, i) => {
				let w = 0;
				let t = 0;
				for (const s of pool) {
					const c = s.series[reg.key][i];
					if (c > 0) {
						w += s.n.length * c;
						t += c;
					}
				}
				return t ? Math.round((w / t) * 100) / 100 : 0;
			});
			return {
				id: reg.key,
				name: reg.label,
				gender,
				color: REGION_COLORS[reg.key],
				values,
				ranks: years.map(() => null)
			};
		});
	});

	const distribution = $derived.by(() => {
		if (!ds) return { bars: [] as { len: number; share: number; pct: number }[], avg: 0 };
		const i = year - years[0];
		const pool = ds.names.filter((s) => s.g === gender);
		const buckets = new Map<number, number>();
		let total = 0;
		let wsum = 0;
		for (const s of pool) {
			const c = s.series[region][i];
			if (c > 0) {
				const L = s.n.length;
				buckets.set(L, (buckets.get(L) ?? 0) + c);
				total += c;
				wsum += L * c;
			}
		}
		if (!total) return { bars: [], avg: 0 };
		const lens = [...buckets.keys()].sort((a, b) => a - b);
		const lo = lens[0];
		const hi = lens[lens.length - 1];
		const bars = [];
		let mx = 0;
		for (let L = lo; L <= hi; L++) mx = Math.max(mx, buckets.get(L) ?? 0);
		for (let L = lo; L <= hi; L++) {
			const c = buckets.get(L) ?? 0;
			bars.push({ len: L, share: (c / total) * 100, pct: mx ? (c / mx) * 100 : 0 });
		}
		return { bars, avg: wsum / total };
	});

	const regionLabel = $derived(ds ? ds.meta.regions.find((r) => r.key === region)?.label ?? '' : '');

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
			year = ds.meta.years.at(-1) ?? 0;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<div class="page">
	<header>
		<h1>La longueur des prénoms</h1>
		<p class="sub">Combien de lettres ? Et est-ce différent d'une région à l'autre ?</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<div class="tab-bar gtoggle">
			<button class="tab" class:active={gender === 'f'} onclick={() => (gender = 'f')}>Filles</button>
			<button class="tab" class:active={gender === 'm'} onclick={() => (gender = 'm')}>Garçons</button>
		</div>

		<section>
			<h3>Longueur moyenne par région</h3>
			<p class="cap">Nombre moyen de lettres, pondéré par les naissances ({years[0]}–{years.at(-1)}).</p>
			<div class="block chart"><TrendChart series={avgSeries} {years} /></div>
		</section>

		<section>
			<h3>Distribution des longueurs : {regionLabel}, {year}</h3>
			<div class="distctl">
				<RegionTabs regions={ds.meta.regions} value={region} onChange={(r) => (region = r)} />
				<label class="year">
					<span class="year-val">{year}</span>
					<input type="range" min={years[0]} max={years.at(-1)} bind:value={year} />
				</label>
			</div>
			<div class="block">
				<p class="avg">Moyenne : <b>{distribution.avg.toFixed(1)}</b> lettres</p>
				<div class="hist">
					{#each distribution.bars as b (b.len)}
						<div class="hrow">
							<span class="hlen">{b.len}</span>
							<span class="hbar"><span class="hfill" style="width:{b.pct}%; background:{REGION_COLORS[region]}"></span></span>
							<span class="hpct">{b.share.toFixed(0)}%</span>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<ChartSource />
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
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
	.gtoggle {
		align-self: flex-start;
	}
	.tab {
		border: none;
		border-radius: 9px;
		padding: 7px 16px;
		font: 600 0.78rem var(--font);
		color: var(--text-secondary);
		background: transparent;
		cursor: pointer;
	}
	.tab.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}
	.cap {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.78rem;
	}
	.block {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.block.chart {
		padding: 10px 8px 6px;
		height: 300px;
	}
	.distctl {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.distctl :global(.tab-bar) {
		flex: 1;
		min-width: 240px;
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
	.avg {
		margin: 0 0 10px;
		color: var(--text-secondary);
		font-size: 0.88rem;
	}
	.avg b {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.hist {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.hrow {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.82rem;
	}
	.hlen {
		width: 1.6em;
		text-align: right;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.hbar {
		flex: 1;
		height: 14px;
		background: var(--surface-2);
		border-radius: 4px;
		overflow: hidden;
	}
	.hfill {
		display: block;
		height: 100%;
		border-radius: 4px;
		transition: width 0.4s ease;
	}
	.hpct {
		width: 3em;
		text-align: right;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
</style>
