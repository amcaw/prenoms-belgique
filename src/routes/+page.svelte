<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadMeta } from '$lib/data';

	let first = $state(1995);
	let last = $state(2025);

	onMount(async () => {
		try {
			const m = await loadMeta(fetch);
			first = m.years[0];
			last = m.years.at(-1) ?? last;
		} catch {
			void 0;
		}
	});

	const routes = [
		{
			href: '/mon-prenom',
			title: 'Mon prénom en 6 cartes',
			desc: 'Entrez votre prénom : une story interactive vous raconte son histoire, sa région, sa génération.'
		},
		{
			href: '/comparateur',
			title: 'Comparateur de prénoms',
			desc: "Cherchez n'importe quel prénom et comparez l'évolution des naissances depuis 1995, par région."
		},
		{
			href: '/prenom',
			title: 'Votre prénom',
			desc: 'À la mode ou en voie de disparition ? Verdict, âge moyen et prénoms de votre classe.'
		},
		{
			href: '/palmares',
			title: 'Le palmarès',
			desc: 'Le top 10 de chaque région et genre, en tableau, pour la dernière année disponible.'
		},
		{
			href: '/tape',
			title: 'Tapez un prénom',
			desc: 'Les courbes de naissances se révèlent en direct, lettre après lettre.'
		},
		{
			href: '/regions',
			title: 'Le grand écart régional',
			desc: 'Flandre, Wallonie et Bruxelles ne donnent pas du tout les mêmes prénoms.'
		},
		{
			href: '/course',
			title: 'La course des prénoms',
			desc: 'Le classement animé des prénoms qui se doublent, année après année.'
		},
		{
			href: '/carte',
			title: 'La Belgique des prénoms',
			desc: 'Une carte : le prénom n°1 de chaque province, ou la carte d’un prénom donné.'
		},
		{
			href: '/modes',
			title: 'Les prénoms les plus donnés chaque année',
			desc: "Les prénoms ayant occupé la première place, et la durée moyenne d'une mode."
		},
		{
			href: '/societe',
			title: '30 ans de tendances',
			desc: 'Diversité, longueur, individualisation : ce que les prénoms disent de la société.'
		},
		{
			href: '/longueur',
			title: 'La longueur des prénoms',
			desc: 'Combien de lettres, et est-ce différent selon les régions ?'
		},
		{
			href: '/insolite',
			title: 'Insolite',
			desc: 'Feux de paille, prénoms mixtes et bonds spectaculaires, par région.'
		},
		{
			href: '/stars',
			title: 'Stars & fictions',
			desc: 'Les prénoms dont la courbe trahit un film, une série ou une célébrité.'
		}
	];
</script>

<div class="home">
	<header>
		<h1>Les prénoms en Belgique, {first}–{last}</h1>
		<p class="sub">Plusieurs façons d'explorer les données de naissances de Statbel.</p>
	</header>

	<nav class="routes">
		{#each routes as r (r.href)}
			<a class="card" href={`${base}${r.href}`}>
				<span class="card-title">{r.title}</span>
				<span class="card-desc">{r.desc}</span>
				<span class="card-go">Ouvrir →</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: none;
		margin: 0;
		padding: 0;
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.sub {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.routes {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 18px 20px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text);
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.card:hover {
		border-color: var(--accent);
		background: var(--surface-hover);
	}
	.card-title {
		font-size: 1.05rem;
		font-weight: 700;
	}
	.card-desc {
		color: var(--text-secondary);
		font-size: 0.85rem;
		line-height: 1.45;
	}
	.card-go {
		margin-top: 2px;
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 600;
	}
	@media (min-width: 680px) {
		.routes {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
