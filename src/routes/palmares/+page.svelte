<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, fmtInt, type Dataset, type Gender, type RegionKey } from '$lib/data';
	import RegionTabs from '$lib/components/RegionTabs.svelte';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let regionM = $state<RegionKey>('be');
	let regionF = $state<RegionKey>('be');

	const year = $derived(ds ? (ds.meta.years.at(-1) ?? 0) : 0);
	const yi = $derived(ds ? ds.meta.years.length - 1 : 0);
	const regions = $derived(ds ? ds.meta.regions : []);

	interface Cell {
		name: string;
		count: number;
	}
	function top10(region: RegionKey, g: Gender): Cell[] {
		if (!ds) return [];
		return ds.names
			.filter((s) => s.g === g)
			.map((s) => ({ name: s.n, count: s.series[region][yi] }))
			.filter((o) => o.count > 0)
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
	}
	const rowsM = $derived(top10(regionM, 'm'));
	const rowsF = $derived(top10(regionF, 'f'));

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<svelte:head><title>Le palmarès des prénoms</title></svelte:head>

<div class="page">
	<header>
		<h1>Le palmarès</h1>
		{#if ds}
			<p class="sub">Le top 10 des prénoms par genre en {year}. Choisissez la région de chaque tableau.</p>
		{/if}
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		{@render genderTable('Garçons', 'm', regionM, (r) => (regionM = r), rowsM)}
		{@render genderTable('Filles', 'f', regionF, (r) => (regionF = r), rowsF)}
		<ChartSource />
	{/if}
</div>

{#snippet genderTable(title: string, g: Gender, reg: RegionKey, onRegion: (r: RegionKey) => void, rows: Cell[])}
	<section class="tbl">
		<h2 class="tt {g}">{title}</h2>
		<RegionTabs {regions} value={reg} onChange={onRegion} />
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th class="rk">#</th>
						<th class="np">Prénom</th>
						<th class="num">Nombre</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as c, i (c.name)}
						<tr>
							<td class="rk">{i + 1}</td>
							<td class="np">{c.name}</td>
							<td class="num">{fmtInt(c.count)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/snippet}

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

	.tbl {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.tt {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}
	.tt.f {
		color: var(--gender-f);
	}
	.tt.m {
		color: var(--gender-m);
	}

	.table-wrap {
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--surface);
		overflow: hidden;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	thead th {
		background: var(--surface-2);
		font-weight: 700;
		padding: 9px 14px;
		text-align: left;
		color: var(--text-secondary);
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	th.rk,
	td.rk {
		width: 38px;
		text-align: center;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	th.num,
	td.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
	}
	tbody td {
		padding: 8px 14px;
		border-top: 1px solid var(--divider);
	}
	tbody tr:nth-child(even) td {
		background: color-mix(in srgb, var(--surface-2) 45%, transparent);
	}
	td.np {
		font-weight: 600;
		color: var(--text);
	}
</style>
