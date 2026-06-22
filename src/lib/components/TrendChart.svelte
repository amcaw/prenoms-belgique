<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { line, curveMonotoneX } from 'd3-shape';
	import { max } from 'd3-array';
	import { fmtInt } from '$lib/data';
	import type { Gender } from '$lib/data';
	import ChartTooltip from './ChartTooltip.svelte';

	export interface ChartSeries {
		id: string;
		name: string;
		gender: Gender;
		color: string;
		values: number[];
		ranks: (number | null)[];
	}

	let { series, years }: { series: ChartSeries[]; years: number[] } = $props();

	let width = $state(0);
	let height = $state(0);

	function longest(s: ChartSeries[]) {
		return s.reduce((m, x) => Math.max(m, x.name.length), 0);
	}

	const rightPad = $derived(
		series.length ? Math.min(220, Math.max(56, longest(series) * 8.4 + 16)) : 14
	);
	const margin = $derived({ top: 18, right: rightPad, bottom: 26, left: 46 });

	const innerW = $derived(Math.max(0, width - margin.left - margin.right));
	const innerH = $derived(Math.max(0, height - margin.top - margin.bottom));

	const x = $derived(
		scaleLinear()
			.domain([years[0], years[years.length - 1]])
			.range([0, innerW])
	);

	const yMax = $derived(series.length ? (max(series, (s) => max(s.values)) ?? 10) : 100);
	const y = $derived(scaleLinear().domain([0, yMax]).range([innerH, 0]).nice());

	const lineGen = $derived(
		line<number>()
			.x((_, i) => x(years[i]))
			.y((d) => y(d))
			.curve(curveMonotoneX)
	);

	const paths = $derived(series.map((s) => ({ ...s, d: lineGen(s.values) ?? '' })));

	const xTicks = $derived(years.filter((yr, i) => yr % 5 === 0 || i === years.length - 1));
	const yTicks = $derived(series.length ? y.ticks(5).filter((t) => Number.isInteger(t)) : []);

	const endLabels = $derived.by(() => {
		if (!series.length || innerH <= 0) return [];
		const minGap = 15;
		const pad = 7;
		const items = series.map((s) => {
			const ay = y(s.values[s.values.length - 1]);
			return { id: s.id, name: s.name, color: s.color, anchorY: ay, labelY: ay };
		});
		items.sort((a, b) => a.anchorY - b.anchorY);
		let prev = -Infinity;
		for (const it of items) {
			it.labelY = Math.max(it.anchorY, prev + minGap);
			prev = it.labelY;
		}
		let next = Infinity;
		for (let i = items.length - 1; i >= 0; i--) {
			items[i].labelY = Math.min(items[i].labelY, next - minGap, innerH - pad);
			if (items[i].labelY < pad) items[i].labelY = pad;
			next = items[i].labelY;
		}
		return items;
	});

	let hoverIdx = $state<number | null>(null);
	let svgEl = $state<SVGSVGElement | null>(null);

	function onMove(event: PointerEvent) {
		if (!svgEl || !series.length || innerW <= 0) return;
		const rect = svgEl.getBoundingClientRect();
		const px = event.clientX - rect.left - margin.left;
		const yr = x.invert(Math.max(0, Math.min(innerW, px)));
		hoverIdx = Math.max(0, Math.min(years.length - 1, Math.round(yr) - years[0]));
	}
	const onLeave = () => (hoverIdx = null);

	const hoverRows = $derived.by(() => {
		if (hoverIdx === null) return [];
		const i = hoverIdx;
		return series
			.map((s) => ({ id: s.id, name: s.name, color: s.color, value: s.values[i], rank: s.ranks[i] }))
			.sort((a, b) => b.value - a.value);
	});
	const hoverX = $derived(hoverIdx === null ? 0 : x(years[hoverIdx]));
	const tipOnLeft = $derived(hoverX > innerW * 0.62);

	function drawIn(node: SVGPathElement) {
		const len = node.getTotalLength();
		if (!len) return;
		node.style.strokeDasharray = `${len} ${len}`;
		node.style.strokeDashoffset = `${len}`;
		requestAnimationFrame(() => {
			node.style.transition = 'stroke-dashoffset 0.85s ease';
			node.style.strokeDashoffset = '0';
		});
		node.addEventListener(
			'transitionend',
			() => {
				node.style.strokeDasharray = '';
				node.style.transition = '';
			},
			{ once: true }
		);
	}
</script>

<div class="chart" bind:clientWidth={width} bind:clientHeight={height}>
	{#if width > 0 && height > 0}
		<svg
			bind:this={svgEl}
			{width}
			{height}
			role="img"
			aria-label="Évolution du nombre de naissances par prénom et par an"
			onpointermove={onMove}
			onpointerdown={onMove}
			onpointerleave={onLeave}
		>
			<g transform="translate({margin.left},{margin.top})">
				{#each xTicks as yr (yr)}
					<line class="grid-v" x1={x(yr)} x2={x(yr)} y1="0" y2={innerH} />
				{/each}

				{#each yTicks as t (t)}
					<g class="grid" transform="translate(0,{y(t)})">
						<line x1="0" x2={innerW} />
						<text x="-8" dy="0.32em">{fmtInt(t)}</text>
					</g>
				{/each}

				<line class="axis-base" x1="0" x2={innerW} y1={innerH} y2={innerH} />
				{#each xTicks as yr (yr)}
					<text class="x-label" x={x(yr)} y={innerH + 18}>{yr}</text>
				{/each}

				{#if hoverIdx !== null}
					<line class="crosshair" x1={hoverX} x2={hoverX} y1="0" y2={innerH} />
				{/if}

				{#each paths as p (p.id)}
					<path class="line" d={p.d} stroke={p.color} use:drawIn />
				{/each}

				{#if hoverIdx !== null}
					{#each hoverRows as r (r.id)}
						<circle class="dot" cx={hoverX} cy={y(r.value)} r="4" fill={r.color} />
					{/each}
				{/if}

				{#each endLabels as l (l.id)}
					{#if Math.abs(l.labelY - l.anchorY) > 4}
						<line
							class="leader"
							x1={innerW}
							y1={l.anchorY}
							x2={innerW + 6}
							y2={l.labelY}
							stroke={l.color}
						/>
					{/if}
					<text class="end-label" x={innerW + 8} y={l.labelY} dy="0.32em" fill={l.color}>
						{l.name}
					</text>
				{/each}
			</g>
		</svg>
	{/if}

	{#if series.length === 0}
		<div class="empty">
			<span>Cherchez un prénom pour tracer sa courbe.</span>
		</div>
	{/if}

	{#if hoverIdx !== null && hoverRows.length}
		<ChartTooltip
			x={margin.left + hoverX}
			y={margin.top}
			side={tipOnLeft ? 'left' : 'right'}
			label={years[hoverIdx]}
			rows={hoverRows}
		/>
	{/if}
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 220px;
	}
	svg {
		display: block;
		touch-action: pan-y;
	}
	.grid-v {
		stroke: var(--divider);
		shape-rendering: crispEdges;
	}
	.grid line {
		stroke: var(--divider);
		shape-rendering: crispEdges;
	}
	.grid text {
		fill: var(--text-muted);
		font-size: 11px;
		text-anchor: end;
		font-variant-numeric: tabular-nums;
	}
	.axis-base {
		stroke: var(--border);
		shape-rendering: crispEdges;
	}
	.x-label {
		fill: var(--text-muted);
		font-size: 11px;
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
	}
	.line {
		fill: none;
		stroke-width: 2.5;
		stroke-linejoin: round;
		stroke-linecap: round;
		transition: d 0.6s ease;
	}
	.crosshair {
		stroke: var(--border-strong);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}
	.dot {
		stroke: var(--surface);
		stroke-width: 2;
	}
	.leader {
		stroke-width: 1;
		opacity: 0.5;
	}
	.end-label {
		font-size: 12px;
		font-weight: 600;
		text-anchor: start;
	}

	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 0 24px;
		text-align: center;
		pointer-events: none;
	}
	.empty span {
		max-width: 320px;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

</style>
