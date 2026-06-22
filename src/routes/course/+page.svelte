<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { fade } from 'svelte/transition';
	import { loadDataset, fmtInt, type Dataset, type Gender, type RegionKey } from '$lib/data';
	import { colorForIndex } from '$lib/colors';
	import RegionTabs from '$lib/components/RegionTabs.svelte';

	const ROW = 38;
	const N = 12;

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let gender = $state<Gender>('f');
	let region = $state<RegionKey>('be');
	let year = $state(0);
	let playing = $state(false);

	const years = $derived(ds ? ds.meta.years : []);
	const yearIdx = $derived(years.length ? year - years[0] : 0);

	$effect(() => {
		if (!playing || !ds) return;
		const ys = ds.meta.years;
		const id = setInterval(() => {
			const i = ys.indexOf(year);
			year = i >= ys.length - 1 ? ys[0] : ys[i + 1];
		}, 900);
		return () => clearInterval(id);
	});

	const raceColors = $derived.by(() => {
		const m = new Map<string, string>();
		if (!ds) return m;
		let idx = 0;
		for (let yi = 0; yi < years.length; yi++) {
			const top = ds.names
				.filter((s) => s.g === gender)
				.map((s) => ({ n: s.n, v: s.series[region][yi] }))
				.filter((o) => o.v > 0)
				.sort((a, b) => b.v - a.v)
				.slice(0, N);
			for (const o of top) if (!m.has(o.n)) m.set(o.n, colorForIndex(idx++));
		}
		return m;
	});

	const bars = $derived.by(() => {
		if (!ds) return [];
		const top = ds.names
			.filter((s) => s.g === gender)
			.map((s) => ({ name: s.n, value: s.series[region][yearIdx] }))
			.filter((o) => o.value > 0)
			.sort((a, b) => b.value - a.value)
			.slice(0, N);
		const mx = top.length ? top[0].value : 1;
		return top.map((o, i) => ({
			...o,
			rank: i,
			pct: (o.value / mx) * 100,
			color: raceColors.get(o.name) ?? 'var(--accent)'
		}));
	});

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
			year = ds.meta.years[0] ?? 0;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<div class="page">
	<header>
		<h1>La course des prénoms</h1>
		<p class="sub">Le classement des prénoms les plus donnés, qui se double année après année.</p>
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
			<button class="play" onclick={() => (playing = !playing)} aria-label={playing ? 'Pause' : 'Lecture'}>
				{playing ? '⏸' : '▶'}
			</button>
			<label class="year">
				<input type="range" min={years[0]} max={years.at(-1)} bind:value={year} />
			</label>
		</div>

		<RegionTabs regions={ds.meta.regions} value={region} onChange={(r) => (region = r)} />

		<div class="race-wrap">
			<span class="big-year">{year}</span>
			<div class="race" style="height:{N * ROW}px">
				{#each bars as b (b.name)}
					<div
						class="bar"
						style="transform:translateY({b.rank * ROW}px); --c:{b.color}"
						transition:fade={{ duration: 300 }}
					>
						<span class="fill" style="width:{b.pct}%"></span>
						<span class="bn">{b.name}</span>
						<span class="bv">{fmtInt(b.value)}</span>
					</div>
				{/each}
			</div>
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
		flex: 1;
		min-width: 180px;
	}
	input[type='range'] {
		flex: 1;
		accent-color: var(--accent);
		cursor: pointer;
	}
	.race-wrap {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px;
	}
	.big-year {
		position: absolute;
		right: 20px;
		bottom: 14px;
		font-size: 3.2rem;
		font-weight: 700;
		color: var(--text-muted);
		opacity: 0.25;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}
	.race {
		position: relative;
	}
	.bar {
		position: absolute;
		left: 0;
		right: 0;
		height: 32px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		background: var(--c);
		border-radius: 7px;
		opacity: 0.9;
		transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.bn {
		position: relative;
		font-weight: 700;
		font-size: 0.85rem;
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	}
	.bv {
		position: relative;
		margin-left: auto;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		font-size: 0.82rem;
		color: var(--text);
	}
</style>
