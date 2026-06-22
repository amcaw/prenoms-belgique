<script lang="ts">
	import { scaleSqrt } from 'd3-scale';
	import { fade } from 'svelte/transition';
	import type { Dataset, NameStat } from '$lib/data';

	let {
		ds,
		colorFor,
		onToggle
	}: {
		ds: Dataset;
		colorFor: (id: string) => string | null;
		onToggle: (s: NameStat) => void;
	} = $props();

	type GenderFilter = 'all' | 'f' | 'm';
	let gender = $state<GenderFilter>('all');
	const LIMIT = 500;

	const cloud = $derived.by(() => {
		const pool = gender === 'all' ? ds.names : ds.names.filter((s) => s.g === gender);
		const top = pool.slice(0, LIMIT);
		const totals = top.map((s) => s.t);
		const size = scaleSqrt()
			.domain([Math.min(...totals), Math.max(...totals)])
			.range([13, 38]);
		return top
			.slice()
			.sort((a, b) => a.n.localeCompare(b.n, 'fr'))
			.map((s) => ({ stat: s, size: size(s.t) }));
	});

	let cloudEl = $state<HTMLDivElement>();
	let scrolled = $state(false);
	let scrollable = $state(false);

	function onCloudScroll() {
		if (cloudEl) scrolled = cloudEl.scrollTop > 6;
	}

	$effect(() => {
		cloud;
		const el = cloudEl;
		if (!el) return;
		const check = () => {
			scrollable = el.scrollHeight > el.clientHeight + 8;
			scrolled = el.scrollTop > 6;
		};
		check();
		const ro = new ResizeObserver(check);
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

<div class="cloud-pane">
	<div class="cloud-head">
		<div class="tab-bar" role="tablist">
			<button class="tab" class:active={gender === 'all'} onclick={() => (gender = 'all')}>Tous</button
			>
			<button class="tab" class:active={gender === 'f'} onclick={() => (gender = 'f')}>Filles</button
			>
			<button class="tab" class:active={gender === 'm'} onclick={() => (gender = 'm')}
				>Garçons</button
			>
		</div>
	</div>

	<div class="cloud" bind:this={cloudEl} onscroll={onCloudScroll}>
		{#each cloud as item (item.stat.id)}
			{@const color = colorFor(item.stat.id)}
			<button
				type="button"
				class="word {item.stat.g}"
				class:selected={!!color}
				style="font-size:{item.size}px; {color ? `--c:${color}` : ''}"
				title={`${item.stat.n} (${item.stat.g})`}
				onclick={() => onToggle(item.stat)}
			>
				{item.stat.n}
			</button>
		{/each}
	</div>

	{#if scrollable && !scrolled}
		<div class="scroll-cue" aria-hidden="true" transition:fade={{ duration: 180 }}>
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</div>
	{/if}
</div>

<style>
	.cloud-pane {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
	.cloud-head {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 12px;
	}
	.scroll-cue {
		position: absolute;
		left: 50%;
		bottom: 8px;
		transform: translateX(-50%);
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-contrast);
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.28);
		pointer-events: none;
		animation: cue 1.4s ease-in-out infinite;
	}
	@keyframes cue {
		0%,
		100% {
			transform: translateX(-50%) translateY(0);
		}
		50% {
			transform: translateX(-50%) translateY(5px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.scroll-cue {
			animation: none;
		}
	}
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
		padding: 6px 12px;
		font: 600 0.76rem var(--font);
		color: var(--text-secondary);
		background: transparent;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.tab:hover {
		color: var(--text);
	}
	.tab.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.cloud {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		line-height: 1.5;
		text-align: justify;
	}
	.word {
		display: inline;
		border: none;
		background: transparent;
		padding: 1px 5px;
		margin: 1px 0;
		border-radius: 6px;
		color: var(--text-secondary);
		font-family: var(--font);
		font-weight: 600;
		line-height: 1.15;
		cursor: pointer;
		transition:
			color 0.12s,
			background 0.12s;
		vertical-align: baseline;
	}
	.word:hover {
		color: var(--text);
		background: var(--surface-hover);
	}
	.word.selected {
		color: var(--c);
		background: color-mix(in srgb, var(--c) 16%, transparent);
	}
</style>
