const hl = (s: string | number) => `<span class="hl">${s}</span>`;

export const copy = {
	byline: 'Source : Statbel · ≥ 5 naissances/an · depuis 1995',

	eyebrow: {
		input: 'Votre prénom',
		cover: '',
		region: 'Quelle partie du pays ?',
		map: (year: number) => `Carte ${year}`,
		reine: 'L’année reine',
		length: 'Vous & la moyenne',
		palmares: (year: number) => `Le palmarès ${year}`,
		mixte: 'Fille ou garçon ?',
		final: 'La société bouge',
		share: 'À partager'
	},

	input: {
		title: 'What’s in a name ?',
		lead: 'Chaque année, Statbel publie le palmarès des prénoms les plus donnés en Belgique depuis 1995. Voici l’histoire du vôtre.',
		placeholder: 'Tapez votre prénom',
		submit: 'Voir →',
		notFound: (q: string) =>
			`Pas de « ${q} » : moins de 5 naissances par an, ou absent depuis 1995. Ça ne veut pas dire que personne ne l’a porté, juste qu'il est rare !`,
		epiceneLead: (name: string) => `${name} se donne aussi bien aux garçons qu'aux filles. Vous voulez l’histoire…`,
		epiceneF: 'côté filles',
		epiceneM: 'côté garçons',
		epiceneCount: (count: string, firstYear: number) => `${count} depuis ${firstYear}`
	},

	cover: {
		trend: {
			confidentiel: 'Confidentiel',
			rare: 'Plutôt rare',
			disparition: 'En voie de disparition',
			essor: 'En plein essor',
			hausse: 'En hausse',
			chute: 'En chute libre',
			baisse: 'En baisse',
			mode: 'Une mode passée',
			sommet: 'À son apogée',
			stable: 'Une valeur sûre'
		},
		sub: (firstYear: number, count: string, genderLabel: string) =>
			`Depuis ${firstYear}, ce prénom a été donné à ${hl(count)} ${genderLabel} au total.`,
		confidentialNote: 'Mais jamais cinq la même année : Statbel ne le publie pas dans le détail annuel, donc pas de courbe ni de palmarès.'
	},

	region: {
		title: (adj: string | null) => (adj ? `Plutôt ${adj}` : 'Difficile à situer'),
		body: (name: string, prep: string | null, firstYear: number, domShare: number, fem: boolean) =>
			prep
				? `On donne ${name} plutôt ${prep}. Depuis ${firstYear}, ${domShare}% des ${name} y sont ${fem ? 'nées' : 'nés'}.`
				: `${name} est trop rare dans les listes régionales pour trancher.`
	},

	map: {
		title: 'Où, exactement ?',
		legend: (name: string, year: number) => `${name} nés par province (${year})`,
		body: (a: { name: string; tops: string[]; count: number; year: number; masked: boolean; total: string; g: 'f' | 'm' }) =>
			(a.tops.length === 1
				? `C’est dans la ${hl(a.tops[0])} qu’il y a eu le plus de ${a.name} l'année dernière, avec ${hl(a.count)} naissances. `
				: `${a.name} arrive en tête dans ${a.tops.length} provinces à égalité l'année dernière (${a.tops.map((t) => hl(t)).join(', ')}), avec ${hl(a.count)} naissances chacune. `) +
			`${a.masked ? 'Les provinces sans chiffre en comptent moins de 5. ' : ''}` +
			`Au total, ${hl(a.total)} ${a.g === 'f' ? 'petites' : 'petits'} ${a.name} sont né${a.g === 'f' ? 'es' : 's'} en Belgique en ${a.year}.`,
		rare: (name: string, year: number) => `${name} reste trop rare pour apparaître par province (données 2017–${year}).`
	},

	reine: {
		sub: (name: string, peakCount: string) =>
			`C’est l’année où ${name} a été le plus donné en Belgique, avec ${hl(peakCount)} naissances.`
	},

	length: {
		title: (n: number) => `${n} lettres`,
		sub: (genderLabel: string, first: string, lastVal: string, name: string, n: number) =>
			`Les prénoms raccourcissent : la moyenne ${genderLabel} est passée de ${hl(first)} à ${hl(lastVal)} lettres. ${name} en fait ${hl(n)}.`
	},

	palmares: {
		pos: (year: number, name: string, rank: number | null, genderLabel: string) =>
			rank
				? `En ${year}, ${name} est ${rank}ᵉ au classement des ${genderLabel} du pays.`
				: `En ${year}, ${name} compte moins de 5 naissances, sorti des radars.`
	},

	mixte: {
		title: 'Mixte',
		sub: (name: string, fPct: number, mPct: number) =>
			`${name} est porté par ${hl(fPct + '%')} de filles et ${hl(mPct + '%')} de garçons. C'est l’un des prénoms les plus unisexes du pays.`
	},

	final: {
		title: 'On se ressemble de moins en moins',
		sub: (genderLabel: string, first: string, lastVal: string) =>
			`Les 10 prénoms de ${genderLabel} les plus donnés couvraient ${hl(first + '%')} des bébés en 1995, contre ${hl(lastVal + '%')} aujourd’hui.`
	},

	share: {
		title: 'Faites tourner',
		sub: (name: string, total: string, commLower: string) =>
			`${name} : ${total} naissances depuis 1995, ${commLower}. Envoyez votre verdict à quelqu’un qui porte le même prénom que vous... ou pas.`,
		text: (name: string, total: string, peakYear: number) =>
			`${name} : ${total} naissances en Belgique depuis 1995, au sommet en ${peakYear}. Et le tien ?`,
		mailSubject: (name: string) => `Le prénom ${name} en Belgique`,
		whatsappBtn: 'WhatsApp',
		facebookBtn: 'Facebook',
		blueskyBtn: 'Bluesky',
		linkedinBtn: 'LinkedIn',
		mailBtn: 'E-mail',
		copyBtn: 'Copier le lien',
		copied: 'Lien copié !',
		againBtn: '↺ Un autre prénom'
	}
};
