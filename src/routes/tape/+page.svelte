<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import { exportSquareFromContainer } from '$lib/exportChart';
	import { scaleLinear } from 'd3-scale';
	import { line, curveMonotoneX } from 'd3-shape';
	import { max } from 'd3-array';
	import {
		loadDataset,
		normalize,
		searchNames,
		fmtInt,
		type Dataset,
		type NameStat,
		type RegionKey
	} from '$lib/data';

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let query = $state('Louis');
	let region = $state<RegionKey>('be');
	let selectedId = $state<string | null>(null);
	let open = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let chartEl = $state<HTMLDivElement | null>(null);
	let saving = $state(false);
	let width = $state(0);
	let height = $state(0);
	const embedded = typeof window !== 'undefined' && window.self !== window.top;

	const years = $derived(ds ? ds.meta.years : []);
	const q = $derived(normalize(query));

	const suggestions = $derived(ds && q ? searchNames(ds, query, 8) : []);

	const match = $derived.by<NameStat | null>(() => {
		if (!ds) return null;
		if (selectedId) {
			const s = ds.byId.get(selectedId);
			if (s && normalize(s.n) === q) return s;
		}
		return suggestions[0] ?? null;
	});

	function pick(s: NameStat) {
		selectedId = s.id;
		query = s.n;
		open = false;
		inputEl?.focus();
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
		else if (e.key === 'Enter' && suggestions[0]) pick(suggestions[0]);
	}

	async function saveJpg() {
		if (!chartEl || saving || !match) return;
		saving = true;
		try {
			const panel = chartEl.closest('.panel');
			const bg = panel ? getComputedStyle(panel).backgroundColor : '#003d60';
			await exportSquareFromContainer(chartEl, {
				filename: `prenom-${match?.n ?? 'tape'}`,
				background: bg,
				fonts: [
					{ family: 'Anton', weights: [] },
					{ family: 'Montserrat', weights: ['400', '600'] }
				]
			});
		} finally {
			saving = false;
		}
	}

	const display = $derived((match ? match.n : query || ' ').toUpperCase());
	const values = $derived(match ? match.series[region] : years.map(() => 0));

	const margin = { top: 18, right: 18, bottom: 28, left: 46 };
	const innerW = $derived(Math.max(0, width - margin.left - margin.right));
	const innerH = $derived(Math.max(0, height - margin.top - margin.bottom));
	const x = $derived(
		scaleLinear()
			.domain([years[0] ?? 1995, years.at(-1) ?? 2024])
			.range([0, innerW])
	);
	const yMax = $derived(Math.max(10, max(values) ?? 10));
	const y = $derived(scaleLinear().domain([0, yMax]).range([innerH, 6]).nice());
	const ln = $derived(
		line<number>()
			.x((_, i) => x(years[i]))
			.y((d) => y(d))
			.curve(curveMonotoneX)(values) ?? ''
	);
	const yTicks = $derived(y.ticks(5).filter((t) => Number.isInteger(t)));
	const xTicks = $derived(years.filter((yr, i) => yr % 10 === 0 || i === 0 || i === years.length - 1));

	function valueAt(yr: number) {
		const f = yr - (years[0] ?? 0);
		const i0 = Math.max(0, Math.min(values.length - 1, Math.floor(f)));
		const i1 = Math.min(values.length - 1, i0 + 1);
		const t = f - i0;
		return values[i0] * (1 - t) + values[i1] * t;
	}

	let fontReady = $state(false);
	let measureCtx: CanvasRenderingContext2D | null = null;
	function advances(chars: string[]) {
		if (!fontReady || typeof document === 'undefined') return chars.map(() => 0.56);
		measureCtx ??= document.createElement('canvas').getContext('2d');
		const ctx = measureCtx;
		if (!ctx) return chars.map(() => 0.56);
		ctx.font = '400 100px "Anton"';
		return chars.map((ch) => ctx.measureText(ch).width / 100);
	}

	const TRACK = 0.04;
	const letters = $derived.by(() => {
		const chars = [...display];
		const L = chars.length || 1;
		const adv = advances(chars);
		const totalU = adv.reduce((a, b) => a + b, 0) + (L - 1) * TRACK;
		const fs = Math.max(8, innerW / (totalU || 1));
		const natCap = fs * 0.72;
		let cursor = 0;
		return chars.map((ch, i) => {
			const w = adv[i] * fs;
			const cx = cursor + w / 2;
			cursor += w + TRACK * fs;
			const v = valueAt(x.invert(cx));
			const target = Math.max(2, innerH - y(v));
			return { ch, cx, fs, sy: target / natCap };
		});
	});

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
			inputEl?.focus();
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
		try {
			await document.fonts.load('400 100px "Anton"');
		} catch {}
		fontReady = true;
	});
</script>

<div class="panel" class:embedded>
	<div class="topbar">
		{#if ds}
			<button class="save" onclick={saveJpg} disabled={saving || !match} aria-label="Enregistrer en JPG">
				{saving ? '…' : '⤓ JPG'}
			</button>
		{/if}
		<div class="search-box">
			<input
				bind:this={inputEl}
				bind:value={query}
				class="search"
				type="text"
				placeholder="Tapez un prénom"
				autocomplete="off"
				spellcheck="false"
				maxlength="20"
				aria-label="Tapez un prénom"
				oninput={() => (open = true)}
				onblur={() => setTimeout(() => (open = false), 120)}
				onkeydown={onKey}
			/>
			{#if open && suggestions.length}
				<ul class="suggest">
					{#each suggestions as s (s.id)}
						<li>
							<button type="button" class="sug" onclick={() => pick(s)}>
								<span class="sug-name">{s.n}</span>
								<span class="sug-g {s.g}">
									<span class="dot {s.g}"></span>{s.g === 'f' ? 'fille' : 'garçon'}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if ds}
			<div class="rtabs">
				{#each ds.meta.regions as r (r.key)}
					<button class="rtab" class:active={region === r.key} onclick={() => (region = r.key)}>
						{r.label}
					</button>
				{/each}
			</div>
		{/if}
		<div class="vtitle">
			{#if match}
				<span class="cur-g {match.g}"><span class="dot {match.g}"></span>{match.g === 'f' ? 'fille' : 'garçon'}</span>
			{/if}
			Nombre de naissances par an
		</div>
	</div>

	{#if loadError}
		<p class="msg">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="msg">Chargement…</p>
	{:else}
		<div class="chart" bind:this={chartEl} bind:clientWidth={width} bind:clientHeight={height}>
			{#if width > 0 && height > 0}
				<svg {width} {height}>
					<g transform="translate({margin.left},{margin.top})">
						{#each yTicks as t (t)}
							<line class="grid" x1="0" x2={innerW} y1={y(t)} y2={y(t)} />
							<text class="ylab" x="-10" y={y(t)} dy="0.32em">{fmtInt(t)}</text>
						{/each}

						{#each letters as l, i (i)}
							<text
								class="giant"
								transform="translate({l.cx},{y(0)}) scale(1,{l.sy})"
								font-size={l.fs}>{l.ch}</text
							>
						{/each}

						<path class="halo" d={ln} />
						<path class="curve" d={ln} />

						{#each xTicks as yr (yr)}
							<text class="xlab" x={x(yr)} y={innerH + 20}>{yr}</text>
						{/each}
					</g>
				</svg>
			{/if}
			{#if !query}<div class="hint">Tapez un prénom…</div>{/if}
		</div>

		<ChartSource variant="accent" extra="Visualisation d'après l'expérience de Karim Douieb (baby-names.jetpack.ai)." />
	{/if}
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		min-height: 560px;
		background: var(--accent);
		color: var(--accent-contrast);
		overflow: hidden;
	}
	.panel.embedded {
		height: 600px;
		min-height: 0;
	}
	.topbar {
		position: relative;
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 9px;
		padding: 12px 16px 8px;
	}
	.search-box {
		position: relative;
		width: min(360px, 82%);
		z-index: 5;
	}
	.search {
		width: 100%;
		height: 42px;
		padding: 0 18px;
		background: rgba(255, 255, 255, 0.14);
		border: 1.5px solid rgba(255, 255, 255, 0.55);
		border-radius: 999px;
		color: var(--accent-contrast);
		font: 600 16px var(--font);
		text-align: center;
		outline: none;
	}
	.search::placeholder {
		color: rgba(255, 255, 255, 0.72);
		font-weight: 500;
	}
	.search:focus {
		border-color: #fff;
		background: rgba(255, 255, 255, 0.2);
	}
	.suggest {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 5px;
		list-style: none;
		background: #fff;
		border-radius: 14px;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
		max-height: 280px;
		overflow-y: auto;
	}
	.sug {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		padding: 8px 12px;
		border: none;
		border-radius: 9px;
		background: transparent;
		color: #16202e;
		font: 600 0.9rem var(--font);
		cursor: pointer;
		text-align: left;
	}
	.sug:hover {
		background: #eef1f5;
	}
	.sug-name {
		font-weight: 700;
	}
	.sug-g {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		font-weight: 600;
		color: #5a6b7d;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.cur-g {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-right: 8px;
		padding: 2px 9px 2px 7px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.16);
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		vertical-align: middle;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex: none;
	}
	.dot.f {
		background: var(--gender-f);
	}
	.dot.m {
		background: var(--gender-m);
	}
	.save {
		position: absolute;
		top: 12px;
		right: 14px;
		z-index: 6;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.14);
		color: var(--accent-contrast);
		font: 600 0.72rem var(--font);
		cursor: pointer;
		transition:
			background 0.15s,
			opacity 0.15s;
	}
	.save:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.26);
	}
	.save:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.rtabs {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
	}
	.rtab {
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: var(--accent-contrast);
		border-radius: 999px;
		padding: 5px 12px;
		font: 600 0.74rem var(--font);
		cursor: pointer;
		transition: background 0.15s;
	}
	.rtab:hover {
		background: rgba(255, 255, 255, 0.22);
	}
	.rtab.active {
		background: #fff;
		color: var(--accent);
		border-color: #fff;
	}
	.vtitle {
		font-size: 0.82rem;
		opacity: 0.9;
		font-weight: 600;
	}
	.msg {
		margin: auto;
		opacity: 0.9;
	}
	.chart {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
	}
	svg {
		display: block;
	}
	.grid {
		stroke: var(--accent-contrast);
		opacity: 0.32;
		stroke-dasharray: 4 5;
	}
	.ylab,
	.xlab {
		fill: var(--accent-contrast);
		opacity: 0.9;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.ylab {
		text-anchor: end;
	}
	.xlab {
		text-anchor: middle;
	}
	.giant {
		fill: var(--accent-contrast);
		font-family: 'Anton', var(--font);
		font-weight: 400;
		text-anchor: middle;
		pointer-events: none;
	}
	.halo {
		fill: none;
		stroke: var(--accent-contrast);
		stroke-width: 5;
		stroke-opacity: 0.85;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.curve {
		fill: none;
		stroke: #2b3a5e;
		stroke-opacity: 0.55;
		stroke-width: 2.2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.hint {
		position: absolute;
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		opacity: 0.8;
		font-size: 1.2rem;
		font-weight: 600;
		pointer-events: none;
	}
</style>
