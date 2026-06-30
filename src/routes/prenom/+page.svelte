<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import {
		loadDataset,
		idOf,
		peakInfo,
		fmtInt,
		genderLabel,
		type Dataset,
		type NameStat
	} from '$lib/data';
	import { colorForIndex } from '$lib/colors';
	import Search from '$lib/components/Search.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import type { ChartSeries } from '$lib/components/TrendChart.svelte';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let active = $state<NameStat | null>(null);
	let classYear = $state(2005);

	const years = $derived(ds ? ds.meta.years : []);
	const selectedIds = $derived(new Set(active ? [active.id] : []));

	const info = $derived.by(() => {
		if (!ds || !active) return null;
		const be = active.series.be;
		const peak = peakInfo(be);
		const latest = be[be.length - 1];
		const refYear = years[years.length - 1];
		let wsum = 0;
		let tot = 0;
		for (let i = 0; i < be.length; i++) {
			wsum += (refYear - years[i]) * be[i];
			tot += be[i];
		}
		const meanAge = tot ? wsum / tot : 0;
		const ratio = peak.value ? latest / peak.value : 0;
		const recent = peak.idx >= be.length - 6;
		let status: string;
		let tone: 'up' | 'flat' | 'down';
		let line: string;
		if (recent && ratio > 0.7) {
			status = 'À la mode';
			tone = 'up';
			line = `${active.n} n'a jamais été aussi donné qu'aujourd'hui.`;
		} else if (ratio < 0.2) {
			status = 'En voie de disparition';
			tone = 'down';
			line = `${active.n} a quasiment disparu des maternités.`;
		} else if (ratio < 0.6) {
			status = 'En déclin';
			tone = 'down';
			line = `${active.n} a connu son heure de gloire, puis a reflué.`;
		} else {
			status = 'Toujours populaire';
			tone = 'flat';
			line = `${active.n} traverse les générations sans faiblir.`;
		}
		const ranks = ds.ranks.get(active.id)!.be;
		let bestRank: number | null = null;
		let bestYear = 0;
		for (let i = 0; i < ranks.length; i++) {
			const r = ranks[i];
			if (r !== null && (bestRank === null || r < bestRank)) {
				bestRank = r;
				bestYear = years[i];
			}
		}
		return { status, tone, line, peak, latest, meanAge, bestRank, bestYear };
	});

	const series = $derived<ChartSeries[]>(
		ds && active
			? [
					{
						id: active.id,
						name: active.n,
						gender: active.g,
						color: colorForIndex(0),
						values: active.series.be,
						ranks: ds.ranks.get(active.id)!.be
					}
				]
			: []
	);

	function classTop(g: 'f' | 'm') {
		if (!ds) return [];
		const i = classYear - years[0];
		return ds.names
			.filter((s) => s.g === g && s.series.be[i] > 0)
			.sort((a, b) => b.series.be[i] - a.series.be[i])
			.slice(0, 8);
	}
	const classF = $derived(classTop('f'));
	const classM = $derived(classTop('m'));

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
			active = ds.byId.get(idOf('Emma', 'f')) ?? ds.names[0];
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<div class="page">
	<header>
		<h1>Votre prénom</h1>
		<p class="sub">Cherchez un prénom : est-il à la mode, ou en voie de disparition ?</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<Search {ds} {selectedIds} onAdd={(s) => (active = s)} />

		{#if active && info}
			<section class="verdict {info.tone}">
				<div class="v-name">{active.n} <span>· {genderLabel(active.g)}</span></div>
				<div class="v-status">{info.status}</div>
				<div class="v-line">{info.line}</div>
				<div class="v-stats">
					<div><b>{years[info.peak.idx]}</b><span>année record</span></div>
					<div><b>{fmtInt(active.t)}</b><span>depuis {years[0]}</span></div>
					<div><b>{info.bestRank ? `#${info.bestRank}` : '–'}</b><span>meilleur rang</span></div>
					<div><b>~{Math.round(info.meanAge)} ans</b><span>âge moyen</span></div>
				</div>
			</section>

			<section class="block chart">
				<TrendChart {series} {years} />
			</section>
		{/if}

		<h3 class="section">Votre classe de…</h3>
		<label class="year">
			<span class="year-val">{classYear}</span>
			<input type="range" min={years[0]} max={years.at(-1)} bind:value={classYear} />
		</label>
		<div class="cols">
			<section class="col">
				<h2>Filles</h2>
				<ol>
					{#each classF as s, i (s.id)}
						<li><span class="rk">{i + 1}</span><span class="nm">{s.n}</span></li>
					{/each}
				</ol>
			</section>
			<section class="col">
				<h2>Garçons</h2>
				<ol>
					{#each classM as s, i (s.id)}
						<li><span class="rk">{i + 1}</span><span class="nm">{s.n}</span></li>
					{/each}
				</ol>
			</section>
		</div>

		<ChartSource />
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
	.verdict {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 16px 18px;
	}
	.v-name {
		font-size: 1.1rem;
		font-weight: 700;
	}
	.v-name span {
		color: var(--text-muted);
		font-weight: 500;
		font-size: 0.85rem;
	}
	.v-status {
		margin-top: 4px;
		font-size: 1.7rem;
		font-weight: 700;
	}
	.verdict.up .v-status {
		color: var(--positive);
	}
	.verdict.down .v-status {
		color: var(--negative);
	}
	.v-line {
		margin-top: 4px;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	.v-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		margin-top: 14px;
	}
	.v-stats div {
		background: var(--surface-2);
		border-radius: 10px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
	}
	.v-stats b {
		font-size: 1.15rem;
		font-variant-numeric: tabular-nums;
	}
	.v-stats span {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.block.chart {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 10px 8px 6px;
		height: 300px;
	}
	.section {
		margin: 6px 0 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.year {
		display: flex;
		align-items: center;
		gap: 10px;
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
	.cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.col {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px;
	}
	h2 {
		margin: 0 0 8px;
		font-size: 0.95rem;
		font-weight: 700;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	li {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 0.85rem;
		padding: 3px 0;
	}
	.rk {
		width: 1.4em;
		text-align: right;
		color: var(--text-muted);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.nm {
		font-weight: 600;
	}
</style>
