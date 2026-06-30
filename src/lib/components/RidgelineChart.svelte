<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { area, curveBasis } from 'd3-shape';
	import { max } from 'd3-array';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { colorForIndex, textOn } from '$lib/colors';
	import { topNames, fmtInt, type Dataset, type Gender, type RegionKey } from '$lib/data';
	import ChartTooltip from './ChartTooltip.svelte';

	let {
		ds,
		gender,
		region,
		title
	}: {
		ds: Dataset;
		gender: Gender;
		region: RegionKey;
		title: string;
	} = $props();

	const years = $derived(ds.meta.years);
	const mode = $derived(topNames(ds, gender, region, 10));

	let width = $state(0);
	const height = $derived(Math.round(Math.min(360, Math.max(240, width * 0.42))));
	const margin = { top: 20, right: 14, bottom: 26, left: 52 };
	const innerW = $derived(Math.max(0, width - margin.left - margin.right));
	const innerH = $derived(Math.max(0, height - margin.top - margin.bottom));

	const x = $derived(
		scaleLinear()
			.domain([years[0], years[years.length - 1]])
			.range([0, innerW])
	);
	const SLOTS = 10;
	const targetMatrix = $derived.by(() => {
		const yc = years.length;
		const rows: number[][] = [];
		for (let i = 0; i < SLOTS; i++) {
			const s = mode.names[i];
			rows.push(s ? s.series[region].slice() : new Array(yc).fill(0));
		}
		return rows;
	});

	const reduceMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const prog = new Tween(0, { duration: reduceMotion ? 0 : 600, easing: cubicOut });
	$effect(() => {
		targetMatrix;
		prog.set(0, { duration: 0 }).then(() => prog.set(1));
	});
	const cur = $derived(targetMatrix.map((row) => row.map((v) => v * prog.current)));

	const yMax = $derived(Math.max(10, max(targetMatrix.flat()) ?? 10));
	const y = $derived(scaleLinear().domain([0, yMax]).range([innerH, 0]).nice());

	const areaGen = $derived(
		area<number>()
			.x((_, i) => x(years[i]))
			.y0(innerH)
			.y1((d) => y(d))
			.curve(curveBasis)
	);

	const series = $derived(
		cur
			.map((vals, i) => {
				const s = mode.names[i];
				return s ? { id: s.id, color: colorForIndex(i), d: areaGen(vals) ?? '' } : null;
			})
			.filter((o): o is { id: string; color: string; d: string } => o !== null)
	);

	const xTicks = $derived(years.filter((yr, i) => yr % 10 === 0 || i === 0 || i === years.length - 1));
	const yTicks = $derived(y.ticks(4).filter((t) => Number.isInteger(t)));

	const labels = $derived.by(() => {
		if (!innerW || !innerH) return [];
		const labelH = 22;
		const laneGap = 4;
		const top0 = margin.top + 2;
		const items = mode.names.map((s, i) => {
			const v = s.series[region];
			let peakIdx = 0;
			for (let k = 1; k < v.length; k++) if (v[k] > v[peakIdx]) peakIdx = k;
			const cx = margin.left + x(years[peakIdx]);
			const w = s.n.length * 8.5 + 18;
			return {
				name: s.n,
				color: colorForIndex(i),
				w,
				left: Math.max(2, Math.min(width - w - 2, cx - w / 2))
			};
		});
		items.sort((a, b) => a.left - b.left);
		const laneRight: number[] = [];
		return items.map((it) => {
			let lane = 0;
			while (lane < laneRight.length && it.left < laneRight[lane] + 8) lane++;
			laneRight[lane] = it.left + it.w;
			return { ...it, top: top0 + lane * (labelH + laneGap) };
		});
	});

	let svgEl = $state<SVGSVGElement | null>(null);
	let hoverIdx = $state<number | null>(null);

	function onMove(e: PointerEvent) {
		if (!svgEl || innerW <= 0) return;
		const rect = svgEl.getBoundingClientRect();
		const px = e.clientX - rect.left - margin.left;
		const yr = x.invert(Math.max(0, Math.min(innerW, px)));
		hoverIdx = Math.max(0, Math.min(years.length - 1, Math.round(yr) - years[0]));
	}
	const onLeave = () => (hoverIdx = null);

	const hoverRows = $derived.by(() => {
		if (hoverIdx === null) return [];
		const i = hoverIdx;
		return mode.names
			.map((s, k) => ({ id: s.id, name: s.n, color: colorForIndex(k), value: s.series[region][i] }))
			.filter((r) => r.value > 0)
			.sort((a, b) => b.value - a.value);
	});
	const hoverX = $derived(hoverIdx === null ? 0 : x(years[hoverIdx]));
	const tipLeft = $derived(hoverX > innerW * 0.6);
</script>

<div class="ridge" bind:clientWidth={width}>
	{#if width > 0}
		<svg
			bind:this={svgEl}
			{width}
			{height}
			role="img"
			aria-label={`Prénoms les plus donnés : ${title}`}
			onpointermove={onMove}
			onpointerdown={onMove}
			onpointerleave={onLeave}
		>
			<g transform="translate({margin.left},{margin.top})">
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

				{#each series as s, i (i)}
					<path class="area" d={s.d} fill={s.color} stroke={s.color} />
				{/each}

				{#if hoverIdx !== null}
					<line class="crosshair" x1={hoverX} x2={hoverX} y1="0" y2={innerH} />
					{#each hoverRows as r (r.id)}
						<circle class="hdot" cx={hoverX} cy={y(r.value)} r="3.5" fill={r.color} />
					{/each}
				{/if}

				<text class="y-title" transform="translate(-40,{innerH / 2}) rotate(-90)">
					Nombre de naissances
				</text>
			</g>
		</svg>

		{#if hoverIdx !== null && hoverRows.length}
			<ChartTooltip
				x={margin.left + hoverX}
				y={margin.top}
				side={tipLeft ? 'left' : 'right'}
				label={years[hoverIdx]}
				rows={hoverRows}
			/>
		{/if}

		{#each labels as l (l.name)}
			<div
				class="name-label"
				style="left:{l.left}px; top:{l.top}px; width:{l.w}px; background:{l.color}; color:{textOn(
					l.color
				)}"
			>
				{l.name}
			</div>
		{/each}
	{/if}
</div>

<style>
	.ridge {
		position: relative;
		width: 100%;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
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
	.y-title {
		fill: var(--text-muted);
		font-size: 11px;
		text-anchor: middle;
	}
	.area {
		fill-opacity: 0.28;
		stroke-width: 1.5;
		stroke-opacity: 0.85;
	}
	.crosshair {
		stroke: var(--border-strong);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}
	.hdot {
		stroke: var(--surface);
		stroke-width: 1.5;
	}
	svg {
		touch-action: pan-y;
	}
	.name-label {
		position: absolute;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8px;
		border-radius: 7px;
		font: 600 0.74rem var(--font);
		white-space: nowrap;
		pointer-events: none;
		box-sizing: border-box;
	}
</style>
