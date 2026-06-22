<script lang="ts">
	import type { Region, RegionKey } from '$lib/data';

	let {
		regions,
		value,
		onChange
	}: {
		regions: Region[];
		value: RegionKey;
		onChange: (r: RegionKey) => void;
	} = $props();
</script>

<div class="tab-bar" role="tablist">
	{#each regions as r (r.key)}
		<button class="tab" class:active={value === r.key} onclick={() => onChange(r.key)}>
			{r.label}
		</button>
	{/each}
</div>

<style>
	.tab-bar {
		display: flex;
		width: 100%;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 3px;
		gap: 2px;
	}
	.tab {
		flex: 1;
		border: none;
		border-radius: 9px;
		padding: 7px 12px;
		font: 600 0.78rem var(--font);
		color: var(--text-secondary);
		background: transparent;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
		white-space: nowrap;
	}
	.tab:hover {
		color: var(--text);
	}
	.tab.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}
</style>
