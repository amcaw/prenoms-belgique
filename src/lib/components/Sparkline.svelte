<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { line, area, curveMonotoneX } from 'd3-shape';
	import { max } from 'd3-array';
	import ChartTooltip from './ChartTooltip.svelte';

	let {
		values,
		color = 'var(--accent)',
		w = 120,
		h = 34,
		fill = true,
		mark = null,
		years = null,
		name = ''
	}: {
		values: number[];
		color?: string;
		w?: number;
		h?: number;
		fill?: boolean;
		mark?: number | null;
		years?: number[] | null;
		name?: string;
	} = $props();

	const mx = $derived(max(values) ?? 1);
	const x = $derived(
		scaleLinear()
			.domain([0, values.length - 1])
			.range([1, w - 1])
	);
	const y = $derived(scaleLinear().domain([0, mx || 1]).range([h - 2, 2]));
	const ln = $derived(
		line<number>()
			.x((_, i) => x(i))
			.y((d) => y(d))
			.curve(curveMonotoneX)(values) ?? ''
	);
	const ar = $derived(
		area<number>()
			.x((_, i) => x(i))
			.y0(h - 1)
			.y1((d) => y(d))
			.curve(curveMonotoneX)(values) ?? ''
	);

	let svgEl = $state<SVGSVGElement | null>(null);
	let hoverIdx = $state<number | null>(null);
	let hoverXpx = $state(0);
	let hoverSide = $state<'left' | 'right'>('right');

	function onMove(e: PointerEvent) {
		if (!svgEl || !years) return;
		const rect = svgEl.getBoundingClientRect();
		const rel = e.clientX - rect.left;
		hoverXpx = rel;
		const t = rel / rect.width;
		hoverSide = t > 0.6 ? 'left' : 'right';
		hoverIdx = Math.max(0, Math.min(values.length - 1, Math.round(t * (values.length - 1))));
	}
	const onLeave = () => (hoverIdx = null);
</script>

{#if years}
	<div class="spark-wrap" style="position:relative">
		<svg
			bind:this={svgEl}
			width={w}
			height={h}
			viewBox="0 0 {w} {h}"
			preserveAspectRatio="none"
			class="spark"
			onpointermove={onMove}
			onpointerdown={onMove}
			onpointerleave={onLeave}
			role="img"
			aria-label={name}
		>
			{#if fill}<path d={ar} fill={color} opacity="0.16" />{/if}
			{#if mark !== null && mark >= 0 && mark < values.length}
				<line x1={x(mark)} x2={x(mark)} y1="0" y2={h} stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
			{/if}
			<path class="ln" d={ln} pathLength="1" fill="none" stroke={color} stroke-width="1.5" />
			{#if hoverIdx !== null}
				<line x1={x(hoverIdx)} x2={x(hoverIdx)} y1="0" y2={h} stroke="var(--border-strong)" stroke-width="1" vector-effect="non-scaling-stroke" />
			{/if}
		</svg>
		{#if hoverIdx !== null}
			<ChartTooltip
				x={hoverXpx}
				y={0}
				side={hoverSide}
				label={years[hoverIdx]}
				rows={[{ id: 'v', color, name: name || 'naissances', value: values[hoverIdx] }]}
			/>
		{/if}
	</div>
{:else}
	<svg width={w} height={h} viewBox="0 0 {w} {h}" preserveAspectRatio="none" class="spark">
		{#if fill}<path d={ar} fill={color} opacity="0.16" />{/if}
		{#if mark !== null && mark >= 0 && mark < values.length}
			<line x1={x(mark)} x2={x(mark)} y1="0" y2={h} stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
		{/if}
		<path d={ln} fill="none" stroke={color} stroke-width="1.5" />
	</svg>
{/if}

<style>
	.spark {
		display: block;
	}
	.spark-wrap {
		width: 100%;
	}
</style>
