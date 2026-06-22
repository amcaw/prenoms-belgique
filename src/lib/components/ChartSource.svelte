<script lang="ts">
	let { extra, variant = 'default' }: { extra?: string; variant?: 'default' | 'accent' } = $props();
	const NOTE =
		'Statbel ne publie pas les prénoms portés par moins de 5 enfants une même année : une absence (ou un « 0 ») ne signifie donc pas « aucune naissance », mais moins de 5 occurrences.';
	const URL =
		'https://statbel.fgov.be/fr/themes/population/noms-et-prenoms/prenoms-filles-et-garcons';
</script>

<footer class="chart-source" class:accent={variant === 'accent'}>
	<span class="note">{NOTE}</span>
	{#if extra}<span class="note">{extra}</span>{/if}
	<a class="link" href={URL} target="_blank" rel="noopener">Source : Statbel ↗</a>
</footer>

<style>
	.chart-source {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		text-align: right;
		border-top: 1px solid var(--divider);
		padding-top: 10px;
		color: var(--text-muted);
		font-size: 0.68rem;
		line-height: 1.5;
	}
	.note {
		max-width: 78ch;
	}
	.link {
		color: var(--text-secondary);
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}
	.link:hover {
		color: var(--accent);
		text-decoration: underline;
	}
	.chart-source.accent {
		padding: 10px 16px 14px;
		border-top-color: rgba(255, 255, 255, 0.25);
		color: rgba(255, 255, 255, 0.82);
	}
	.accent .link {
		color: #fff;
	}
	.accent .link:hover {
		color: #fff;
	}
</style>
