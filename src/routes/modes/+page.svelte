<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, type Dataset, type RegionKey } from '$lib/data';
	import RidgelineChart from '$lib/components/RidgelineChart.svelte';
	import RegionTabs from '$lib/components/RegionTabs.svelte';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let region = $state<RegionKey>('be');

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
		<h1>Les prénoms les plus donnés chaque année</h1>
		<p class="sub">
			Chaque aire colorée est un prénom passé en tête du classement une année donnée ; sa hauteur
			indique le nombre de naissances par an. Les modes se succèdent comme des vagues.
		</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<RegionTabs regions={ds.meta.regions} value={region} onChange={(r) => (region = r)} />
		<section class="block">
			<h2 class="chart-title">Garçons</h2>
			<RidgelineChart {ds} gender="m" {region} title="Garçons" />
		</section>
		<section class="block">
			<h2 class="chart-title">Filles</h2>
			<RidgelineChart {ds} gender="f" {region} title="Filles" />
		</section>

		<ChartSource />
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: none;
		margin: 0;
		padding: 0;
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
		letter-spacing: -0.01em;
	}
	.sub {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.85rem;
		line-height: 1.4;
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
	.block {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 12px;
	}
	.chart-title {
		margin: 0 0 8px;
		padding: 0 4px;
		font-size: 1.05rem;
		font-weight: 700;
	}
</style>
