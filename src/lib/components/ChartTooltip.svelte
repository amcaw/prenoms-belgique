<script lang="ts">
	import { fmtCount } from '$lib/data';

	interface Row {
		id: string;
		color: string;
		name: string;
		value: number;
		rank?: number | null;
	}

	let {
		x,
		y,
		side = 'right',
		label,
		rows
	}: {
		x: number;
		y: number;
		side?: 'left' | 'right';
		label: string | number;
		rows: Row[];
	} = $props();
</script>

<div class="tooltip" class:left={side === 'left'} style="left:{x}px; top:{y}px;">
	<div class="tip-year">{label}</div>
	{#each rows as r (r.id)}
		<div class="tip-row">
			<span class="sw" style="background:{r.color}"></span>
			<span class="tip-name">{r.name}</span>
			<span class="tip-val">{fmtCount(r.value)}</span>
			{#if r.rank}<span class="tip-rank">#{r.rank}</span>{/if}
		</div>
	{/each}
</div>

<style>
	.tooltip {
		position: absolute;
		transform: translateX(12px);
		min-width: 130px;
		max-width: 220px;
		padding: 8px 10px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-shadow: 0 6px 22px rgba(0, 0, 0, 0.28);
		pointer-events: none;
		z-index: 5;
	}
	.tooltip.left {
		transform: translateX(calc(-100% - 12px));
	}
	.tip-year {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 5px;
		font-variant-numeric: tabular-nums;
	}
	.tip-row {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 0.8rem;
		padding: 1px 0;
	}
	.sw {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex: none;
	}
	.tip-name {
		color: var(--text);
		margin-right: auto;
		padding-right: 8px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tip-val {
		color: var(--text);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.tip-rank {
		color: var(--text-muted);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
</style>
