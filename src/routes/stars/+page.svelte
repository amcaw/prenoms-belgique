<script lang="ts">
	import { onMount } from 'svelte';
	import ChartSource from '$lib/components/ChartSource.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import { loadDataset, idOf, fmtInt, type Dataset, type Gender } from '$lib/data';

	interface Pheno {
		name: string;
		g: Gender;
		year: number;
		cat: string;
		scope: 'be' | 'int';
		label: string;
		note: string;
	}

	const PHENOMENA: Pheno[] = [
		{ name: 'Loana', g: 'f', year: 2001, cat: 'Télé-réalité', scope: 'be', label: 'Loft Story', note: 'Quasi inconnu avant 2001, le prénom surgit avec la première saison de Loft Story, puis s’éteint presque aussitôt.' },
		{ name: 'Eden', g: 'm', year: 2018, cat: 'Sport', scope: 'be', label: 'Eden Hazard', note: 'Le prénom culmine en 2018, l’année du Mondial où Hazard porte les Diables rouges jusqu’à la 3ᵉ place.' },
		{ name: 'Roméo', g: 'm', year: 2017, cat: 'Musique', scope: 'be', label: 'Roméo Elvis', note: 'Le prénom remonte dans les années 2010, au rythme de la carrière du rappeur bruxellois.' },
		{ name: 'Rihanna', g: 'f', year: 2008, cat: 'Musique', scope: 'int', label: 'Rihanna', note: 'Le sommet tombe pile en 2008, au zénith de la chanteuse et de « Umbrella ».' },
		{ name: 'Arya', g: 'f', year: 2019, cat: 'Séries', scope: 'int', label: 'Game of Thrones', note: 'La cadette Stark fait grimper le prénom tout au long de la série (2011-2019), et il continue de monter ensuite.' },
		{ name: 'Elsa', g: 'f', year: 2014, cat: 'Cinéma', scope: 'int', label: 'La Reine des neiges', note: 'Rebond net juste après la sortie de Frozen, fin 2013.' },
		{ name: 'Logan', g: 'm', year: 2000, cat: 'Cinéma', scope: 'int', label: 'X-Men', note: 'Bond en 2000, l’année où le premier X-Men met Logan / Wolverine à l’affiche.' },
		{ name: 'Arwen', g: 'f', year: 2003, cat: 'Cinéma', scope: 'int', label: 'Le Seigneur des anneaux', note: 'Inexistant avant la trilogie de Peter Jackson (2001-2003), ce prénom elfique apparaît pile à sa sortie, puis reflue.' },
		{ name: 'Anakin', g: 'm', year: 2005, cat: 'Cinéma', scope: 'int', label: 'Star Wars', note: 'Quelques dizaines d’Anakin au fil des préquelles : un prénom qui n’existe presque que par la fiction.' },
		{ name: 'Alizée', g: 'f', year: 2000, cat: 'Musique', scope: 'int', label: 'Alizée', note: 'La chanteuse explose avec « Moi… Lolita » (2000) : le prénom bondit dans la foulée, surtout côté francophone, puis redescend.' },
		{ name: 'Lorie', g: 'f', year: 2001, cat: 'Musique', scope: 'int', label: 'Lorie', note: 'La pop star ado française fait surgir le prénom au début des années 2000, un phénomène 100 % francophone.' },
		{ name: 'Nolwenn', g: 'f', year: 2002, cat: 'Télé-crochet', scope: 'int', label: 'Nolwenn Leroy', note: 'Pic net en 2003, juste après sa victoire à la Star Academy, puis chute presque aussitôt.' },
		{ name: 'Lauryn', g: 'f', year: 1999, cat: 'Musique', scope: 'int', label: 'Lauryn Hill', note: 'Sommet vers 2000, dans la foulée de « The Miseducation of Lauryn Hill » et de ses Grammys.' },
		{ name: 'Witse', g: 'm', year: 2004, cat: 'Séries', scope: 'be', label: 'Witse (VRT)', note: 'Apparaît avec la série policière flamande « Witse » (2004-2012) : un phénomène exclusivement néerlandophone.' },
		{ name: 'Britney', g: 'f', year: 1999, cat: 'Musique', scope: 'int', label: 'Britney Spears', note: 'Surgit avec « …Baby One More Time » (1999), surtout en Flandre.' },
		{ name: 'Shakira', g: 'f', year: 2001, cat: 'Musique', scope: 'int', label: 'Shakira', note: 'Inexistant avant 2002, le prénom apparaît avec la percée internationale de la chanteuse, quasi uniquement en Flandre.' }
	];

	const RARE = [
		{ n: 'Hermione', l: 'Harry Potter' },
		{ n: 'Daenerys', l: 'Game of Thrones' },
		{ n: 'Khaleesi', l: 'Game of Thrones' },
		{ n: 'Romelu', l: 'Romelu Lukaku' },
		{ n: 'Zlatan', l: 'Zlatan Ibrahimović' },
		{ n: 'Naruto', l: 'Naruto' }
	];

	let ds = $state<Dataset | null>(null);
	let loadError = $state<string | null>(null);
	let view = $state<'be' | 'fr' | 'nl'>('be');

	const sumArr = (a: number[]) => a.reduce((x, y) => x + y, 0);
	function community(o: { series: Record<string, number[]> }) {
		const fl = sumArr(o.series.fl);
		const south = sumArr(o.series.wa) + sumArr(o.series.br);
		const tot = fl + south;
		if (tot < 20) return { key: 'both' as const, pct: 0 };
		const flPct = fl / tot;
		if (flPct >= 0.62) return { key: 'nl' as const, pct: Math.round(flPct * 100) };
		if (flPct <= 0.38) return { key: 'fr' as const, pct: Math.round((1 - flPct) * 100) };
		return { key: 'both' as const, pct: 0 };
	}
	function viewSeries(o: { series: Record<string, number[]> }, vw: 'be' | 'fr' | 'nl') {
		if (vw === 'fr') return o.series.wa.map((w, i) => w + o.series.br[i]);
		if (vw === 'nl') return o.series.fl;
		return o.series.be;
	}

	const cards = $derived.by(() => {
		if (!ds) return [];
		const years = ds.meta.years;
		return PHENOMENA.map((p) => {
			const o = ds!.byId.get(idOf(p.name, p.g));
			if (!o) return null;
			const v = viewSeries(o, view);
			let peak = 0;
			let peakYear = years[0];
			v.forEach((x, i) => {
				if (x > peak) {
					peak = x;
					peakYear = years[i];
				}
			});
			return {
				...p,
				series: v,
				peak,
				peakYear,
				total: sumArr(v),
				mark: years.indexOf(p.year),
				community: community(o)
			};
		}).filter((c) => c !== null);
	});

	onMount(async () => {
		try {
			ds = await loadDataset(fetch);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<svelte:head><title>Stars & fictions : les prénoms qui trahissent une époque</title></svelte:head>

<div class="page">
	<header>
		<h1>Stars & fictions</h1>
		<p class="sub">
			Certains prénoms portent la trace d’un film, d’une série ou d’une célébrité. Leur courbe s’allume
			pile à l’événement ; la ligne pointillée marque l’année. Vue <b>Belgique</b> par défaut ;
			basculez sur une communauté pour voir la même star à travers son public. Le badge rappelle où le
			prénom a surtout pris.
		</p>
	</header>

	{#if loadError}
		<p class="error">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="loading">Chargement des données…</p>
	{:else}
		<div class="tabs">
			<button class="tab" class:active={view === 'be'} onclick={() => (view = 'be')}>Belgique</button>
			<button class="tab" class:active={view === 'fr'} onclick={() => (view = 'fr')}>Francophone</button>
			<button class="tab" class:active={view === 'nl'} onclick={() => (view = 'nl')}>Néerlandophone</button>
		</div>

		<div class="grid">
			{#each cards as c (c.name + c.g)}
				<article class="card">
					<div class="top">
						<span class="nm"><span class="dot {c.g}"></span>{c.name}</span>
						<span class="comm {c.community.key}">
							{#if c.community.key === 'nl'}Néerlandophone · {c.community.pct}%
							{:else if c.community.key === 'fr'}Francophone · {c.community.pct}%
							{:else}Les deux{/if}
						</span>
					</div>
					<div class="label">{c.cat} · {c.label} · {c.year}</div>
					<div class="spark">
						<Sparkline values={c.series} color={c.g === 'f' ? 'var(--gender-f)' : 'var(--gender-m)'} w={260} h={64} mark={c.mark} years={ds.meta.years} name={c.name} />
					</div>
					{#if c.total >= 15}
						<div class="peak">Pic : <b>{fmtInt(c.peak)}</b> en {c.peakYear} · {fmtInt(c.total)} au total</div>
					{:else}
						<div class="peak muted">À peine présent dans cette communauté</div>
					{/if}
					<p class="note">{c.note}</p>
				</article>
			{/each}
		</div>

		<section class="rare">
			<h2>Trop rares pour les statistiques</h2>
			<p class="rare-cap">
				D’autres icônes n’ont quasiment jamais réuni 5 bébés la même année : Statbel ne les publie donc
				pas (ou à peine). Côté Harry Potter, par exemple, aucun prénom n’a vraiment pris en Belgique.
				Leur quasi-absence des chiffres ne veut pas dire que personne ne les a portés, seulement
				qu’ils sont restés sous le seuil.
			</p>
			<div class="chips">
				{#each RARE as r (r.n)}
					<span class="rchip">{r.n}<small>{r.l}</small></span>
				{/each}
			</div>
		</section>

		<ChartSource />
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 700;
	}
	.sub {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.85rem;
		line-height: 1.45;
	}
	.loading,
	.error {
		color: var(--text-muted);
		font-size: 0.9rem;
		padding: 24px 0;
	}
	.error {
		color: var(--negative);
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 3px;
		align-self: flex-start;
	}
	.tab {
		border: none;
		border-radius: 9px;
		padding: 7px 14px;
		font: 600 0.78rem var(--font);
		color: var(--text-secondary);
		background: transparent;
		cursor: pointer;
	}
	.tab.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 14px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 7px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}
	.nm {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 1.15rem;
		font-weight: 700;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.dot.f {
		background: var(--gender-f);
	}
	.dot.m {
		background: var(--gender-m);
	}
	.comm {
		flex: none;
		font-size: 0.66rem;
		font-weight: 600;
		white-space: nowrap;
		padding: 3px 8px;
		border-radius: 999px;
		line-height: 1.2;
	}
	.comm.fr {
		background: color-mix(in srgb, var(--series-0) 16%, transparent);
		color: var(--series-0);
	}
	.comm.nl {
		background: color-mix(in srgb, var(--series-4) 16%, transparent);
		color: var(--series-4);
	}
	.comm.both {
		background: var(--surface-2);
		color: var(--text-muted);
	}
	.label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}
	.spark {
		margin: 2px 0;
	}
	.spark :global(svg) {
		width: 100%;
		height: auto;
	}
	.peak {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.peak b {
		color: var(--text);
	}
	.peak.muted {
		color: var(--text-muted);
		font-style: italic;
	}
	.note {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.rare {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 16px;
	}
	.rare h2 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.rare-cap {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.45;
		max-width: 70ch;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 2px;
	}
	.rchip {
		display: inline-flex;
		flex-direction: column;
		gap: 1px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 6px 12px;
		font-weight: 700;
		font-size: 0.9rem;
	}
	.rchip small {
		font-weight: 500;
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	@media (min-width: 680px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1040px) {
		.grid {
			grid-template-columns: 1fr 1fr 1fr;
		}
	}
</style>
