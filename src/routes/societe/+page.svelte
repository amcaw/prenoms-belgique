<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, fmtInt, type Dataset, type Gender } from '$lib/data';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import type { ChartSeries } from '$lib/components/TrendChart.svelte';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);

	const years = $derived(ds ? ds.meta.years : []);

	function metric(g: Gender) {
		const top10: number[] = [];
		const distinct: number[] = [];
		const len: number[] = [];
		if (!ds) return { top10, distinct, len };
		const pool = ds.names.filter((s) => s.g === g);
		for (let i = 0; i < years.length; i++) {
			const vals = pool.map((s) => ({ n: s.n, v: s.series.be[i] })).filter((o) => o.v > 0);
			const total = vals.reduce((a, b) => a + b.v, 0) || 1;
			vals.sort((a, b) => b.v - a.v);
			const t10 = vals.slice(0, 10).reduce((a, b) => a + b.v, 0);
			top10.push(Math.round((t10 / total) * 1000) / 10);
			distinct.push(vals.length);
			len.push(Math.round((vals.reduce((a, b) => a + b.n.length * b.v, 0) / total) * 100) / 100);
		}
		return { top10, distinct, len };
	}
	const F = $derived(metric('f'));
	const M = $derived(metric('m'));
	const nulls = $derived(years.map(() => null));

	function pair(fv: number[], mv: number[]): ChartSeries[] {
		return [
			{ id: 'f', name: 'Filles', gender: 'f', color: 'var(--gender-f)', values: fv, ranks: nulls },
			{ id: 'm', name: 'Garçons', gender: 'm', color: 'var(--gender-m)', values: mv, ranks: nulls }
		];
	}
	const top10Series = $derived(pair(F.top10, M.top10));
	const distinctSeries = $derived(pair(F.distinct, M.distinct));
	const lenSeries = $derived(pair(F.len, M.len));

	const last = $derived(years.length - 1);

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<div class="page">
	<header>
		<h1>30 ans de tendances</h1>
		<p class="sub">Ce que les prénoms disent de l'évolution de la société belge.</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<section>
			<h3>On donne de moins en moins les mêmes prénoms</h3>
			<p class="stat">
				Chez les filles, le top 10 est passé de <b>{F.top10[0]}%</b> des naissances en {years[0]} à
				<b>{F.top10[last]}%</b> en {years.at(-1)}.
			</p>
			<div class="block"><TrendChart series={top10Series} {years} /></div>
			<p class="cap">Part des naissances couverte par les 10 prénoms les plus donnés (%).</p>
		</section>

		<section>
			<h3>De plus en plus de prénoms différents</h3>
			<p class="stat">
				En {years.at(-1)}, on a recensé <b>{fmtInt(F.distinct[last])}</b> prénoms de filles et
				<b>{fmtInt(M.distinct[last])}</b> de garçons (≥ 5 naissances).
			</p>
			<div class="block"><TrendChart series={distinctSeries} {years} /></div>
			<p class="cap">Nombre de prénoms distincts donnés chaque année.</p>
		</section>

		<section>
			<h3>Des prénoms plus courts</h3>
			<p class="stat">
				Longueur moyenne : <b>{F.len[0]}</b> → <b>{F.len[last]}</b> lettres chez les filles.
			</p>
			<div class="block"><TrendChart series={lenSeries} {years} /></div>
			<p class="cap">Nombre moyen de lettres, pondéré par les naissances.</p>
		</section>

		<ChartSource />
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 18px;
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
	.stat {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	.stat b {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.block {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 10px 8px 6px;
		height: 280px;
	}
	.cap {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.72rem;
	}
</style>
