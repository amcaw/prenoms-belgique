<script lang="ts">
	import { geoMercator, geoPath } from 'd3-geo';

	interface Tip {
		title: string;
		lines: string[];
	}
	interface GeoFeature {
		type: string;
		properties: { nuts: string; name?: string };
		geometry: unknown;
	}
	interface GeoData {
		type: string;
		features: GeoFeature[];
	}

	let {
		geo,
		fills,
		labels,
		tip
	}: {
		geo: GeoData;
		fills: Record<string, string>;
		labels: Record<string, string>;
		tip: Record<string, Tip>;
	} = $props();

	let container = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	const height = $derived(Math.round(Math.max(260, Math.min(560, width * 0.66))));

	const path = $derived.by(() => {
		if (!width || !height) return null;
		const proj = geoMercator().fitSize([width, height], geo as never);
		return geoPath(proj);
	});

	const centroids = $derived.by(() => {
		const p = path;
		if (!p) return [] as { nuts: string; x: number; y: number }[];
		return geo.features.map((f) => {
			const c = p.centroid(f as never);
			return { nuts: f.properties.nuts, x: c[0], y: c[1] };
		});
	});

	let hover = $state<string | null>(null);
	let pos = $state({ x: 0, y: 0 });

	function onMove(e: PointerEvent, nuts: string) {
		hover = nuts;
		if (container) {
			const r = container.getBoundingClientRect();
			pos = { x: e.clientX - r.left, y: e.clientY - r.top };
		}
	}
</script>

<div class="map" bind:this={container} bind:clientWidth={width}>
	{#if path}
		<svg {width} {height} role="img" aria-label="Carte des provinces belges">
			{#each geo.features as f (f.properties.nuts)}
				{@const nuts = f.properties.nuts}
				<path
					class="prov"
					class:active={hover === nuts}
					d={path(f as never) ?? ''}
					fill={fills[nuts] ?? 'var(--surface-2)'}
					onpointermove={(e) => onMove(e, nuts)}
					onpointerleave={() => (hover = null)}
					role="presentation"
				/>
			{/each}
			{#each centroids as c (c.nuts)}
				{#if labels[c.nuts]}
					<text class="lab" x={c.x} y={c.y}>{labels[c.nuts]}</text>
				{/if}
			{/each}
		</svg>

		{#if hover && tip[hover]}
			<div class="tip" class:left={pos.x > width * 0.6} style="left:{pos.x}px; top:{pos.y}px;">
				<div class="tip-title">{tip[hover].title}</div>
				{#each tip[hover].lines as line (line)}
					<div class="tip-line">{line}</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.map {
		position: relative;
		width: 100%;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.prov {
		stroke: var(--surface);
		stroke-width: 1;
		transition: fill 0.4s ease;
		cursor: pointer;
	}
	.prov.active {
		stroke: var(--text);
		stroke-width: 1.5;
	}
	.lab {
		text-anchor: middle;
		dominant-baseline: middle;
		font-size: 12px;
		font-weight: 700;
		fill: #fff;
		stroke: rgba(0, 0, 0, 0.55);
		stroke-width: 2.6px;
		paint-order: stroke;
		pointer-events: none;
	}
	.tip {
		position: absolute;
		transform: translate(12px, -50%);
		min-width: 150px;
		padding: 8px 10px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-shadow: 0 6px 22px rgba(0, 0, 0, 0.28);
		pointer-events: none;
		z-index: 2;
	}
	.tip.left {
		transform: translate(calc(-100% - 12px), -50%);
	}
	.tip-title {
		font-weight: 700;
		font-size: 0.82rem;
		margin-bottom: 4px;
	}
	.tip-line {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
</style>
