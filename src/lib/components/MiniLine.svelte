<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { line, curveMonotoneX } from 'd3-shape';
	import { max, min } from 'd3-array';

	let {
		values,
		years,
		color = 'var(--ink)',
		refValue = null,
		refLabel = '',
		w = 300,
		h = 120,
		fmt = (n: number) => String(n),
		dark = false
	}: {
		values: number[];
		years: number[];
		color?: string;
		refValue?: number | null;
		refLabel?: string;
		w?: number;
		h?: number;
		fmt?: (n: number) => string;
		dark?: boolean;
	} = $props();

	const cValue = $derived(dark ? '#f5f1e8' : '#423e38');
	const cMuted = $derived(dark ? 'rgba(245,241,232,0.66)' : '#9a948a');
	const cRef = $derived(dark ? 'rgba(245,241,232,0.4)' : '#b8b2a6');

	const m = { top: 12, right: 10, bottom: 18, left: 10 };
	const innerW = $derived(w - m.left - m.right);
	const innerH = $derived(h - m.top - m.bottom);

	const lo = $derived(Math.min(min(values) ?? 0, refValue ?? Infinity));
	const hi = $derived(Math.max(max(values) ?? 1, refValue ?? -Infinity));
	const x = $derived(scaleLinear().domain([0, values.length - 1]).range([0, innerW]));
	const y = $derived(scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([innerH, 0]).nice());
	const ln = $derived(line<number>().x((_, i) => x(i)).y((d) => y(d)).curve(curveMonotoneX)(values) ?? '');
</script>

<svg width={w} height={h} viewBox="0 0 {w} {h}" class="mini">
	<g transform="translate({m.left},{m.top})">
		{#if refValue !== null}
			<line class="ref" x1="0" x2={innerW} y1={y(refValue)} y2={y(refValue)} style="stroke:{cRef}" />
			<text class="reflab" x={innerW} y={y(refValue) - 4} style="fill:{cMuted}">{refLabel}</text>
		{/if}
		<path class="ln" d={ln} pathLength="1" style="stroke:{color}" />
		<circle class="dot" cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" style="fill:{color}" />
		<text class="v start" x="0" y={y(values[0]) - 6} style="fill:{cValue}">{fmt(values[0])}</text>
		<text class="v end" x={innerW} y={y(values[values.length - 1]) - 6} style="fill:{cValue}">{fmt(values[values.length - 1])}</text>
		<text class="yr start" x="0" y={innerH + 14} style="fill:{cMuted}">{years[0]}</text>
		<text class="yr end" x={innerW} y={innerH + 14} style="fill:{cMuted}">{years.at(-1)}</text>
	</g>
</svg>

<style>
	.mini {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.ln {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.ref {
		stroke: #b8b2a6;
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}
	.reflab {
		fill: #9a948a;
		font-size: 10px;
		text-anchor: end;
	}
	.v {
		fill: #423e38;
		font-size: 11px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.v.end {
		text-anchor: end;
	}
	.yr {
		fill: #9a948a;
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}
	.yr.end {
		text-anchor: end;
	}
</style>
