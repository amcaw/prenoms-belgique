<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, idOf, type Dataset, type NameStat, type RegionKey } from '$lib/data';
	import { colorForIndex, freeColorSlot, textOn } from '$lib/colors';
	import Search from '$lib/components/Search.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import type { ChartSeries } from '$lib/components/TrendChart.svelte';
	import NameCloud from '$lib/components/NameCloud.svelte';
	import RegionTabs from '$lib/components/RegionTabs.svelte';
	import { exportSquareFromContainer } from '$lib/exportChart';

	let chartPaneEl = $state<HTMLElement>();
	let saving = $state(false);
	let exporting = $state(false);
	let logoUri = $state('');
	const embedded = typeof window !== 'undefined' && window.self !== window.top;

	async function loadLogo() {
		if (logoUri) return;
		try {
			const txt = await fetch(`${base}/rtbf-actus.svg`).then((r) => r.text());
			logoUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(txt)))}`;
		} catch {
			logoUri = '';
		}
	}

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let region = $state<RegionKey>('be');

	interface Sel {
		stat: NameStat;
		colorIdx: number;
	}
	let selected = $state<Sel[]>([]);

	const selectedIds = $derived(new Set(selected.map((s) => s.stat.id)));

	const chartSeries = $derived<ChartSeries[]>(
		ds
			? selected.map((sel) => ({
					id: sel.stat.id,
					name: sel.stat.n,
					gender: sel.stat.g,
					color: colorForIndex(sel.colorIdx),
					values: sel.stat.series[region],
					ranks: ds!.ranks.get(sel.stat.id)![region]
				}))
			: []
	);

	function colorFor(id: string): string | null {
		const s = selected.find((x) => x.stat.id === id);
		return s ? colorForIndex(s.colorIdx) : null;
	}

	function add(stat: NameStat) {
		if (selectedIds.has(stat.id)) return;
		const colorIdx = freeColorSlot(selected.map((s) => s.colorIdx));
		selected = [...selected, { stat, colorIdx }];
	}

	function remove(id: string) {
		selected = selected.filter((s) => s.stat.id !== id);
	}

	function toggle(stat: NameStat) {
		if (selectedIds.has(stat.id)) remove(stat.id);
		else add(stat);
	}

	async function saveJpg() {
		if (!chartPaneEl || saving || !selected.length) return;
		saving = true;
		try {
			await loadLogo();
			exporting = true;
			await tick();
			const bg = getComputedStyle(chartPaneEl).backgroundColor;
			await exportSquareFromContainer(chartPaneEl, {
				filename: `prenoms-${selected.map((s) => s.stat.n).join('-') || 'comparateur'}`,
				background: bg,
				fonts: [{ family: 'Montserrat', weights: ['400', '600', '700'] }]
			});
		} finally {
			exporting = false;
			saving = false;
		}
	}

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
			[idOf('Emma', 'f'), idOf('Louis', 'm')]
				.map((id) => ds!.byId.get(id))
				.filter((s): s is NameStat => !!s)
				.forEach(add);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<div class="widget" class:embedded>
	<header>
		<h1>Comparateur de prénoms</h1>
		{#if ds}
			<p class="sub">
				<span class="no-cloud">Cherchez un prénom, puis comparez l'évolution des naissances.</span><span
					class="with-cloud">Cherchez un prénom ou piochez dans le nuage, puis comparez l'évolution des naissances.</span>
			</p>
		{/if}
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<div class="controls">
			<Search {ds} {selectedIds} onAdd={add} />

			<RegionTabs regions={ds.meta.regions} value={region} onChange={(r) => (region = r)} />

			<div class="chips">
				{#if selected.length === 0}
					<span class="chips-hint">Cherchez un prénom pour tracer sa courbe.</span>
				{:else}
					{#each selected as sel (sel.stat.id)}
						{@const color = colorForIndex(sel.colorIdx)}
						<span class="tag" style="background:{color}; color:{textOn(color)}">
							<span class="tag-name">{sel.stat.n}</span>
							<span class="tag-g">{sel.stat.g}</span>
							<button
								class="tag-x"
								type="button"
								aria-label={`Retirer ${sel.stat.n}`}
								onclick={() => remove(sel.stat.id)}
							>
								×
							</button>
						</span>
					{/each}
				{/if}
			</div>
		</div>

		<div class="content">
			<section class="pane cloud">
				<NameCloud {ds} {colorFor} onToggle={toggle} />
			</section>
			<section class="pane chart" class:export-light={exporting} bind:this={chartPaneEl}>
				{#if selected.length}
					<button class="save-btn" onclick={saveJpg} disabled={saving} aria-label="Enregistrer le graphique en JPG">
						{saving ? '…' : '⤓ JPG'}
					</button>
				{/if}
				<TrendChart series={chartSeries} years={ds.meta.years} {exporting} logo={logoUri} />
			</section>
		</div>

		<ChartSource />
	{/if}
</div>

<style>
	.widget {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 0;
		padding: 0;
		height: 100dvh;
		min-height: 600px;
		overflow: hidden;
	}
	.widget.embedded {
		height: 640px;
		min-height: 0;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: none;
	}
	h1 {
		margin: 0;
		font-size: 1.3rem;
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

	.controls {
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex: none;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		min-height: 32px;
		align-items: center;
		max-height: 96px;
		overflow-y: auto;
	}
	.chips-hint {
		color: var(--text-muted);
		font-size: 0.8rem;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 6px 0 12px;
		border-radius: 999px;
		font: 600 0.82rem var(--font);
	}
	.tag-g {
		opacity: 0.7;
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	.tag-x {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 19px;
		height: 19px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		color: inherit;
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
	}
	.tag-x:hover {
		background: rgba(255, 255, 255, 0.42);
	}

	.content {
		flex: 1 1 0;
		min-height: 0;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: minmax(0, 1fr);
		gap: 16px;
	}
	.pane {
		display: flex;
		flex-direction: column;
		min-height: 0;
		min-width: 0;
	}
	.pane.cloud {
		display: none;
	}
	.with-cloud {
		display: none;
	}
	.pane.chart {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 10px 8px 6px;
	}
	.pane.chart.export-light {
		--surface: #ffffff;
		--text: #2e3238;
		--text-secondary: rgba(46, 50, 56, 0.72);
		--text-muted: rgba(46, 50, 56, 0.5);
		--divider: rgba(0, 0, 0, 0.07);
		--border: rgba(0, 0, 0, 0.12);
		--border-strong: rgba(0, 0, 0, 0.2);
		background: #ffffff;
	}
	.save-btn {
		position: absolute;
		top: 8px;
		right: 10px;
		z-index: 3;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 11px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text-secondary);
		font: 600 0.72rem var(--font);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}
	.save-btn:hover:not(:disabled) {
		color: var(--accent-contrast);
		background: var(--accent);
		border-color: var(--accent);
	}
	.save-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}


	@media (min-width: 920px) {
		.content {
			grid-template-columns: 340px minmax(0, 1fr);
		}
		.pane.cloud {
			display: flex;
		}
		.with-cloud {
			display: inline;
		}
		.no-cloud {
			display: none;
		}
	}
</style>
