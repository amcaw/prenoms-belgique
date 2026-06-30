<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, regionTotals, type Dataset, type Gender } from '$lib/data';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let gender = $state<Gender>('f');

	const COLS = [
		{ key: 'fl' as const, label: 'Flandre', color: 'var(--series-4)' },
		{ key: 'wa' as const, label: 'Wallonie', color: 'var(--series-0)' },
		{ key: 'br' as const, label: 'Bruxelles', color: 'var(--series-3)' }
	];

	const years = $derived(ds ? ds.meta.years : []);

	function mostRegional(region: 'fl' | 'wa' | 'br') {
		if (!ds) return [];
		return ds.names
			.filter((s) => s.g === gender)
			.map((s) => {
				const rt = regionTotals(s);
				return { name: s.n, share: rt.sum ? rt[region] / rt.sum : 0, vol: rt.sum };
			})
			.filter((o) => o.vol >= 400)
			.sort((a, b) => b.share - a.share)
			.slice(0, 8);
	}
	const skews = $derived(COLS.map((c) => ({ ...c, rows: mostRegional(c.key) })));

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
		<h1>Le grand écart régional</h1>
		<p class="sub">
			Flandre, Wallonie et Bruxelles ne donnent pas du tout les mêmes prénoms.
		</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<div class="controls">
			<div class="tab-bar">
				<button class="tab" class:active={gender === 'f'} onclick={() => (gender = 'f')}>Filles</button>
				<button class="tab" class:active={gender === 'm'} onclick={() => (gender = 'm')}>Garçons</button>
			</div>
		</div>

		<h3 class="section">Les prénoms les plus régionaux ({years[0]}–{years.at(-1)})</h3>
		<p class="hint">Part des naissances d'un prénom concentrée dans une seule région.</p>
		<div class="cols">
			{#each skews as col (col.key)}
				<section class="col">
					<h2 style="color:{col.color}">Très « {col.label.toLowerCase()} »</h2>
					<ol class="plain">
						{#each col.rows as r (r.name)}
							<li>
								<span class="nm">{r.name}</span>
								<span class="ct">{Math.round(r.share * 100)} %</span>
							</li>
						{/each}
					</ol>
				</section>
			{/each}
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
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.tab-bar {
		display: flex;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 3px;
		gap: 2px;
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
	.cols {
		display: grid;
		grid-template-columns: 1fr;
		gap: 14px;
	}
	.col {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px;
	}
	h2 {
		margin: 0 0 10px;
		font-size: 1rem;
		font-weight: 700;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	li {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 7px;
		overflow: hidden;
		font-size: 0.85rem;
	}
	.nm {
		position: relative;
		margin-right: auto;
		font-weight: 600;
	}
	.ct {
		position: relative;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.plain li {
		padding: 7px 8px;
	}
	.plain li + li {
		border-top: 1px solid var(--divider);
		border-radius: 0;
	}
	.section {
		margin: 6px 0 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.hint {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.78rem;
	}
	@media (min-width: 760px) {
		.cols {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
