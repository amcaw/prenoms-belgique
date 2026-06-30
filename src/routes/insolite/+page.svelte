<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { loadDataset, peakInfo, fmtInt, type Dataset, type NameStat, type RegionKey } from '$lib/data';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import RegionTabs from '$lib/components/RegionTabs.svelte';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let region = $state<RegionKey>('be');
	const years = $derived(ds ? ds.meta.years : []);

	const regSum = (s: NameStat) => s.series[region].reduce((a, b) => a + b, 0);

	const feux = $derived.by(() => {
		if (!ds) return [];
		const floor = region === 'be' ? 300 : 120;
		return ds.names
			.map((s) => ({ s, tot: regSum(s) }))
			.filter((o) => o.tot >= floor)
			.map(({ s, tot }) => {
				const p = peakInfo(s.series[region]);
				return { s, year: years[p.idx], peak: p.value, spike: p.value / tot };
			})
			.sort((a, b) => b.spike - a.spike)
			.slice(0, 10);
	});

	const bonds = $derived.by(() => {
		if (!ds) return [];
		const floor = region === 'be' ? 150 : 50;
		return ds.names
			.filter((s) => regSum(s) >= floor)
			.map((s) => {
				const be = s.series[region];
				let mj = 0;
				let my = 0;
				for (let i = 1; i < be.length; i++) {
					const d = be[i] - be[i - 1];
					if (d > mj) {
						mj = d;
						my = i;
					}
				}
				return { s, jump: mj, year: years[my], from: be[my - 1] ?? 0, to: be[my] };
			})
			.filter((o) => o.jump > 0)
			.sort((a, b) => b.jump - a.jump)
			.slice(0, 10);
	});

	const mixtes = $derived.by(() => {
		if (!ds) return [];
		const floor = region === 'be' ? 400 : 150;
		const byName = new Map<string, { f?: NameStat; m?: NameStat }>();
		for (const s of ds.names) {
			const e = byName.get(s.n) ?? {};
			e[s.g] = s;
			byName.set(s.n, e);
		}
		const out: { name: string; ft: number; mt: number; fshare: number; bal: number }[] = [];
		for (const [name, e] of byName) {
			if (e.f && e.m) {
				const ft = regSum(e.f);
				const mt = regSum(e.m);
				const tot = ft + mt;
				if (tot >= floor) out.push({ name, ft, mt, fshare: ft / tot, bal: (Math.min(ft, mt) / tot) * 2 });
			}
		}
		return out.sort((a, b) => b.bal - a.bal).slice(0, 10);
	});

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
		<h1>Insolite</h1>
		<p class="sub">Feux de paille, prénoms mixtes et bonds spectaculaires, par région.</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<RegionTabs regions={ds.meta.regions} value={region} onChange={(r) => (region = r)} />

		<section class="block">
			<h3>Les feux de paille</h3>
			<p class="cap">Prénoms qui ont explosé sur quelques années avant de retomber.</p>
			<ul>
				{#each feux as f (f.s.id)}
					<li>
						<span class="nm">{f.s.n}<small>{f.s.g}</small></span>
						<span class="meta">
							<span>pic en {f.year}</span>
							<span class="meta-sub">avec {fmtInt(f.peak)} naissances</span>
						</span>
						<Sparkline values={f.s.series[region]} color="var(--series-7)" w={110} h={30} />
					</li>
				{/each}
			</ul>
		</section>

		<section class="block">
			<h3>Les prénoms les plus mixtes</h3>
			<p class="cap">Donnés presque autant aux filles qu'aux garçons.</p>
			<ul>
				{#each mixtes as m (m.name)}
					<li>
						<span class="nm">{m.name}</span>
						<span class="split" aria-hidden="true">
							<span class="fpart" style="width:{Math.round(m.fshare * 100)}%"></span>
						</span>
						<span class="meta">{Math.round(m.fshare * 100)}% F · {100 - Math.round(m.fshare * 100)}% G</span>
					</li>
				{/each}
			</ul>
		</section>

		<section class="block">
			<h3>Les plus gros bonds</h3>
			<p class="cap">Plus forte hausse en une seule année.</p>
			<ul>
				{#each bonds as b (b.s.id)}
					<li>
						<span class="nm">{b.s.n}<small>{b.s.g}</small></span>
						<span class="meta">+{fmtInt(b.jump)} en {b.year} ({fmtInt(b.from)}→{fmtInt(b.to)})</span>
						<Sparkline values={b.s.series[region]} color="var(--positive)" w={110} h={30} />
					</li>
				{/each}
			</ul>
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
	.block {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px 16px;
	}
	h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.cap {
		margin: 4px 0 10px;
		color: var(--text-muted);
		font-size: 0.78rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 0;
		font-size: 0.88rem;
	}
	li + li {
		border-top: 1px solid var(--divider);
	}
	.nm {
		font-weight: 700;
		min-width: 6.5em;
	}
	.nm small {
		color: var(--text-muted);
		font-weight: 500;
		text-transform: uppercase;
		font-size: 0.62rem;
		margin-left: 4px;
	}
	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1.3;
		color: var(--text-secondary);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		margin-left: auto;
	}
	.meta-sub {
		color: var(--text-muted);
		font-size: 0.72rem;
	}
	.split {
		flex: 1;
		max-width: 160px;
		height: 10px;
		border-radius: 5px;
		background: var(--gender-m);
		overflow: hidden;
	}
	.fpart {
		display: block;
		height: 100%;
		background: var(--gender-f);
	}
</style>
