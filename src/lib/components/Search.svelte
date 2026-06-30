<script lang="ts">
	import { searchNames, fmtInt, type Dataset, type NameStat } from '$lib/data';

	let {
		ds,
		selectedIds,
		onAdd
	}: {
		ds: Dataset;
		selectedIds: Set<string>;
		onAdd: (s: NameStat) => void;
	} = $props();

	let query = $state('');
	let focused = $state(false);
	let activeIdx = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	const results = $derived(query.trim() ? searchNames(ds, query, 10) : []);
	const open = $derived(focused && results.length > 0);

	$effect(() => {
		void results;
		activeIdx = 0;
	});

	function add(s: NameStat) {
		onAdd(s);
		query = '';
		inputEl?.focus();
	}

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIdx = (activeIdx + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIdx = (activeIdx - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const s = results[activeIdx];
			if (s) add(s);
		} else if (e.key === 'Escape') {
			query = '';
			inputEl?.blur();
		}
	}
</script>

<div class="search">
	<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="11" cy="11" r="7" />
		<line x1="16.5" y1="16.5" x2="21" y2="21" />
	</svg>
	<input
		bind:this={inputEl}
		bind:value={query}
		type="text"
		placeholder="Rechercher un prénom…"
		autocomplete="off"
		spellcheck="false"
		aria-label="Rechercher un prénom"
		onfocus={() => (focused = true)}
		onblur={() => setTimeout(() => (focused = false), 120)}
		onkeydown={onKey}
	/>

	{#if open}
		<ul class="results" role="listbox">
			{#each results as r, i (r.id)}
				{@const picked = selectedIds.has(r.id)}
				<li>
					<button
						type="button"
						class="result"
						class:active={i === activeIdx}
						class:picked
						role="option"
						aria-selected={i === activeIdx}
						onmousedown={(e) => {
							e.preventDefault();
							add(r);
						}}
						onmouseenter={() => (activeIdx = i)}
					>
						<span class="dot {r.g}" aria-hidden="true"></span>
						<span class="name">{r.n}</span>
						<span class="total">{fmtInt(r.t)}</span>
						{#if picked}
							<span class="check" aria-label="déjà sélectionné">✓</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search {
		position: relative;
	}
	.icon {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		width: 18px;
		height: 18px;
		fill: none;
		stroke: var(--text-muted);
		stroke-width: 2;
		stroke-linecap: round;
		pointer-events: none;
	}
	input {
		width: 100%;
		height: 48px;
		padding: 0 16px 0 42px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		color: var(--text);
		font-size: 16px;
		outline: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	input::placeholder {
		color: var(--text-muted);
	}
	input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.results {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 5px;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
		z-index: 5;
		max-height: 320px;
		overflow-y: auto;
	}
	.result {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 11px;
		border: none;
		background: transparent;
		border-radius: 8px;
		color: var(--text);
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}
	.result.active {
		background: var(--surface-hover);
	}
	.result.picked .name {
		color: var(--text-secondary);
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
	.name {
		margin-right: auto;
		font-weight: 600;
	}
	.total {
		color: var(--text-muted);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
	}
	.check {
		color: var(--accent);
		font-weight: 700;
	}
</style>
