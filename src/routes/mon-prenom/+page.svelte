<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { base } from '$app/paths';
	import {
		loadDataset,
		loadProvinces,
		normalize,
		peakInfo,
		regionTotals,
		genderLabel,
		type Dataset,
		type ProvinceDataset,
		type NameStat,
		type Gender
	} from '$lib/data';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import MiniLine from '$lib/components/MiniLine.svelte';
	import MapChart from '$lib/components/MapChart.svelte';
	import { copy } from './copy';

	interface GeoData {
		type: string;
		features: { type: string; properties: { nuts: string; name?: string }; geometry: unknown }[];
	}

	let ds = $state<Dataset | null>(null);
	let prov = $state<ProvinceDataset | null>(null);
	let geo = $state<GeoData | null>(null);
	let loadError = $state<string | null>(null);
	let query = $state('');
	let attempted = $state(false);
	let idx = $state(0);
	let shareMsg = $state('');
	let chosenG = $state<Gender | null>(null);

	const years = $derived(ds ? ds.meta.years : []);
	const q = $derived(normalize(query));
	const letters = (s: string) => [...s.replace(/[^A-Za-zÀ-ÿ]/g, '')].length;
	const dec = (n: number, d = 1) => n.toFixed(d).replace('.', ',');
	const fmt = (n: number) => (n < 10000 ? String(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

	function resolve(g: Gender): NameStat | null {
		if (!ds || !q) return null;
		const qe = query.trim().toLowerCase();
		let exact: NameStat | null = null;
		let norm: NameStat | null = null;
		for (const o of ds.search) {
			if (o.stat.g !== g || o.norm !== q) continue;
			if (o.stat.n.toLowerCase() === qe) { if (!exact || o.stat.t > exact.t) exact = o.stat; }
			else if (!norm || o.stat.t > norm.t) norm = o.stat;
		}
		return exact ?? norm;
	}
	const statF = $derived(resolve('f'));
	const statM = $derived(resolve('m'));
	const epicene = $derived.by(() => {
		if (!statF || !statM) return false;
		const f = statF.t, m = statM.t, min = Math.min(f, m);
		return min > 0 && (min / (f + m) >= 0.1 || min >= 150);
	});
	const stat = $derived.by<NameStat | null>(() => {
		if (!statF && !statM) return null;
		if (chosenG === 'f' && statF) return statF;
		if (chosenG === 'm' && statM) return statM;
		if (statF && statM) return statF.t >= statM.t ? statF : statM;
		return statF ?? statM;
	});

	function topNameAt(g: Gender, i: number) {
		if (!ds) return '—';
		let best: NameStat | null = null;
		for (const s of ds.names) if (s.g === g && (!best || s.series.be[i] > best.series.be[i])) best = s;
		return best ? best.n : '—';
	}
	function topListAt(g: Gender, i: number, k: number) {
		if (!ds) return [] as { n: string; v: number; rank: number }[];
		return ds.names.filter((s) => s.g === g && s.series.be[i] > 0)
			.map((s) => ({ n: s.n, v: s.series.be[i] }))
			.sort((a, b) => b.v - a.v).slice(0, k).map((o, r) => ({ ...o, rank: r + 1 }));
	}
	const society = $derived.by(() => {
		if (!ds || !stat) return null;
		const pool = ds.names.filter((s) => s.g === stat.g);
		const len: number[] = [], top10: number[] = [], distinct: number[] = [];
		for (let i = 0; i < years.length; i++) {
			const vals = pool.map((s) => ({ v: s.series.be[i], L: letters(s.n) })).filter((o) => o.v > 0);
			const tot = vals.reduce((a, b) => a + b.v, 0) || 1;
			const t10 = [...vals].sort((a, b) => b.v - a.v).slice(0, 10).reduce((a, b) => a + b.v, 0);
			top10.push(Math.round((t10 / tot) * 1000) / 10);
			distinct.push(vals.length);
			len.push(Math.round((vals.reduce((a, b) => a + b.L * b.v, 0) / tot) * 100) / 100);
		}
		return { len, top10, distinct };
	});
	const provView = $derived.by(() => {
		if (!ds || !prov || !stat) return null;
		const inkHex = stat.g === 'f' ? '#84569c' : '#8a7150';
		const py = prov.meta.years.at(-1)!;
		const yObj = prov.data[stat.g][String(py)] ?? {};
		const fills: Record<string, string> = {}, labels: Record<string, string> = {}, tip: Record<string, { title: string; lines: string[] }> = {};
		const cells = prov.meta.provinces.map(({ nuts, label }) => {
			const cell = yObj[nuts];
			return { nuts, label, count: cell?.names[stat.n] ?? 0 };
		});
		const maxCount = Math.max(0, ...cells.map((c) => c.count));
		let top: typeof cells[number] | null = null;
		for (const c of cells) {
			const t = maxCount ? c.count / maxCount : 0;
			fills[c.nuts] = `color-mix(in srgb, ${inkHex} ${Math.round(t * 90)}%, #ece8df)`;
			labels[c.nuts] = c.count > 0 ? String(c.count) : '';
			tip[c.nuts] = { title: c.label, lines: [`${c.count > 0 ? c.count : '< 5'} ${stat.n} en ${py}`] };
			if (c.count > 0 && (!top || c.count > top.count)) top = c;
		}
		const shownSum = cells.reduce((a, c) => a + c.count, 0);
		const tops = cells.filter((c) => c.count > 0 && c.count === maxCount).map((c) => c.label);
		return { fills, labels, tip, top, tops, year: py, max: maxCount, shownSum, has: cells.some((c) => c.count > 0) };
	});

	const profile = $derived.by(() => {
		if (!ds || !stat) return null;
		const g = stat.g;
		const be = stat.series.be;
		const last = be.length - 1;
		const peak = peakInfo(be);
		const peakCount = peak.value;
		const nameLen = letters(stat.n);

		const seriesSum = be.reduce((a, b) => a + b, 0);
		const confidential = stat.t > 0 && seriesSum / stat.t < 0.4;
		const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
		const recent5 = avg(be.slice(last - 4, last + 1));
		const prev5 = avg(be.slice(last - 9, last - 4));
		const mom = prev5 > 0 ? recent5 / prev5 : recent5 > 0 ? 99 : 0;
		const fromPeak = peakCount ? be[last] / peakCount : 0;
		const ageOfPeak = last - peak.idx;
		let trend: 'confidentiel' | 'rare' | 'disparition' | 'essor' | 'hausse' | 'chute' | 'baisse' | 'mode' | 'sommet' | 'stable';
		if (confidential) trend = 'confidentiel';
		else if (stat.t < 250) trend = 'rare';
		else if (fromPeak < 0.15) trend = 'disparition';
		else if (mom >= 1.6) trend = 'essor';
		else if (mom >= 1.18) trend = 'hausse';
		else if (mom <= 0.7) trend = 'chute';
		else if (mom <= 0.85) trend = 'baisse';
		else if (ageOfPeak >= 12 && fromPeak < 0.55) trend = 'mode';
		else if (ageOfPeak <= 4 && fromPeak >= 0.85) trend = 'sommet';
		else trend = 'stable';

		const rt = regionTotals(stat);
		const regSum = rt.sum;
		const shares = {
			fl: regSum ? Math.round((rt.fl / regSum) * 100) : 0,
			wa: regSum ? Math.round((rt.wa / regSum) * 100) : 0,
			br: regSum ? Math.round((rt.br / regSum) * 100) : 0
		};
		const cand: ['fl' | 'wa' | 'br', number, string, string][] = [
			['fl', rt.fl, 'flamand', 'en Flandre'],
			['wa', rt.wa, 'wallon', 'en Wallonie'],
			['br', rt.br, 'bruxellois', 'à Bruxelles']
		];
		let dom = cand[0];
		for (const c of cand) if (c[1] > dom[1]) dom = c;
		const domShare = shares[dom[0]];
		const commLabel = copy.region.title(regSum > 0 ? dom[2] : null);
		const commCopy = copy.region.body(stat.n, regSum > 0 ? dom[3] : null, years[0], domShare, g === 'f');

		const yourRankLast = ds.ranks.get(stat.id)!.be[last];
		let pal = topListAt(g, last, 8).map((r) => ({ ...r, you: r.n === stat.n }));
		if (!pal.some((r) => r.you)) pal.push({ n: stat.n, v: be[last], rank: yourRankLast ?? 0, you: true });
		const palMax = Math.max(1, ...pal.map((r) => r.v));
		const posCopy = copy.palmares.pos(years[last], stat.n, yourRankLast ?? null, genderLabel(g));

		const other = g === 'f' ? statM : statF;
		const both = other ? { f: g === 'f' ? stat.t : other.t, m: g === 'm' ? stat.t : other.t } : null;
		const mixte = both && Math.min(both.f, both.m) / (both.f + both.m) >= 0.15
			? { fPct: Math.round((both.f / (both.f + both.m)) * 100), mPct: Math.round((both.m / (both.f + both.m)) * 100) }
			: null;

		return {
			name: stat.n, g, genderLabel: genderLabel(g), genderWord: g === 'f' ? 'fille' : 'garçon',
			total: stat.t, firstYear: years[0], lastYear: years[last], series: be, latestCount: be[last],
			peakYear: years[peak.idx], peakCount, nameLen, trend, confidential,
			regSum, shares, commLabel, commCopy,
			pal, palMax, posCopy,
			mixte, top1Now: topNameAt(g, last)
		};
	});

	type Card = { kind: string; eyebrow: string; count?: number };
	const cards = $derived.by<Card[]>(() => {
		const c: Card[] = [{ kind: 'input', eyebrow: copy.eyebrow.input }];
		const p = profile;
		if (!p) return c;
		c.push({ kind: 'cover', eyebrow: copy.eyebrow.cover, count: p.total });
		if (p.peakCount > 0) c.push({ kind: 'reine', eyebrow: copy.eyebrow.reine });
		c.push({ kind: 'region', eyebrow: copy.eyebrow.region });
		if (geo && provView) c.push({ kind: 'map', eyebrow: copy.eyebrow.map(provView.year) });
		c.push({ kind: 'length', eyebrow: copy.eyebrow.length });
		c.push({ kind: 'palmares', eyebrow: copy.eyebrow.palmares(p.lastYear) });
		if (p.mixte) c.push({ kind: 'mixte', eyebrow: copy.eyebrow.mixte });
		c.push({ kind: 'final', eyebrow: copy.eyebrow.final });
		c.push({ kind: 'share', eyebrow: copy.eyebrow.share });
		return c;
	});
	const cur = $derived(cards[idx]);

	const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const counter = new Tween(0, { duration: reduce ? 0 : 650, easing: cubicOut });
	$effect(() => {
		const c = cards[idx]?.count;
		counter.set(0, { duration: 0 }).then(() => { if (c != null) counter.set(c); });
	});
	const shown = $derived(Math.round(counter.current));
	const ink = $derived(profile ? (profile.g === 'f' ? '#84569c' : '#8a7150') : '#003d60');
	$effect(() => { if (idx > cards.length - 1) idx = Math.max(0, cards.length - 1); });

	const enc = encodeURIComponent;
	const shareOrigin = typeof location !== 'undefined' ? location.origin : '';
	const shareUrl = $derived(profile ? `${shareOrigin}${base}/mon-prenom?prenom=${enc(profile.name)}&genre=${profile.g}` : '');
	const shareText = $derived(profile ? copy.share.text(profile.name, fmt(profile.total), profile.peakYear) : '');
	const ICON: Record<string, string> = {
		whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
		facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
		bluesky: 'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.829.624-5.789.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z',
		linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
		mail: 'M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0-8 5L4 6h16zm0 12H4V8l8 5 8-5v10z',
		link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'
	};
	const channels = $derived(
		profile
			? [
					{ id: 'whatsapp', label: copy.share.whatsappBtn, icon: ICON.whatsapp, href: `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}` },
					{ id: 'facebook', label: copy.share.facebookBtn, icon: ICON.facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}` },
					{ id: 'bluesky', label: copy.share.blueskyBtn, icon: ICON.bluesky, href: `https://bsky.app/intent/compose?text=${enc(`${shareText} ${shareUrl}`)}` },
					{ id: 'linkedin', label: copy.share.linkedinBtn, icon: ICON.linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}` },
					{ id: 'mail', label: copy.share.mailBtn, icon: ICON.mail, href: `mailto:?subject=${enc(copy.share.mailSubject(profile.name))}&body=${enc(`${shareText}\n\n${shareUrl}`)}` }
				]
			: []
	);

	function submit(e: Event) { e.preventDefault(); attempted = true; if (!stat) return; if (epicene && !chosenG) return; idx = 1; }
	function pick(g: Gender) { chosenG = g; idx = 1; }
	function next() { if (idx < cards.length - 1) idx++; }
	function prev() { if (idx > 0) idx--; }
	function restart() { attempted = false; query = ''; idx = 0; shareMsg = ''; chosenG = null; }
	function onKey(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement) return;
		if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
		else if (e.key === 'ArrowLeft') prev();
	}
	function copyLink() {
		if (!shareUrl) return;
		navigator.clipboard.writeText(shareUrl).then(() => { shareMsg = copy.share.copied; }).catch(() => { shareMsg = shareUrl; });
	}

	onMount(async () => {
		try {
			const [d, p, g] = await Promise.all([
				loadDataset(fetch),
				loadProvinces(fetch),
				fetch(`${base}/be-provinces.geojson`).then((r) => r.json() as Promise<GeoData>)
			]);
			ds = d; prov = p; geo = g;
			const params = new URLSearchParams(location.search);
			const pre = params.get('prenom');
			const gr = params.get('genre');
			if (pre) {
				query = pre;
				if (gr === 'f' || gr === 'm') chosenG = gr;
				await tick();
				attempted = true;
				if (stat && (!epicene || chosenG)) idx = 1;
			}
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Erreur de chargement';
		}
	});
</script>

<svelte:head><title>Mon prénom en cartes — naissances en Belgique</title></svelte:head>
<svelte:window onkeydown={onKey} />

<div class="paper" style="--ink:{ink}">
	{#if loadError}
		<p class="msg">Impossible de charger les données : {loadError}</p>
	{:else if !ds}
		<p class="msg">Chargement…</p>
	{:else if cur}
		<div class="shell">
			<div class="bars">
				{#each cards as _, i (i)}<span class="bar"><span class="fill" class:on={i <= idx}></span></span>{/each}
			</div>
			<span class="dots">{idx + 1} / {cards.length}</span>
			<button class="zone left" onclick={prev} aria-label="Carte précédente"></button>
			<button class="zone right" onclick={next} aria-label="Carte suivante"></button>
			{#if idx > 0}<button class="chev prev" onclick={prev} aria-label="Précédent"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg></button>{/if}
			{#if idx < cards.length - 1}<button class="chev next" onclick={next} aria-label="Suivant"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7" /></svg></button>{/if}

			<article class="card">
				{#key idx}
					<div class="slide" in:fade={{ duration: 200 }}>
						{#if cur.eyebrow}<span class="eyebrow">{cur.eyebrow}</span>{/if}

						{#if cur.kind === 'input'}
							<h2 class="ttl"><em>{copy.input.title}</em></h2>
							<p class="lead">{copy.input.lead}</p>
							<form onsubmit={submit}>
								<input bind:value={query} oninput={() => (chosenG = null)} type="text" placeholder={copy.input.placeholder} autocomplete="off" spellcheck="false" maxlength="24" aria-label="Votre prénom" />
								<button type="submit">{copy.input.submit}</button>
							</form>
							<div class="epi-slot">{#if attempted && stat && epicene && !chosenG && statF && statM}
								<div class="epi">
									<p class="epilead">{copy.input.epiceneLead(stat.n)}</p>
									<div class="epirow">
										<button type="button" class="epibtn f" onclick={() => pick('f')}>
											<span class="lab">{copy.input.epiceneF}</span>
											<small>{copy.input.epiceneCount(fmt(statF.t), years[0])}</small>
											<span class="prop"><i style="width:{Math.round((statF.t / (statF.t + statM.t)) * 100)}%"></i></span>
										</button>
										<button type="button" class="epibtn m" onclick={() => pick('m')}>
											<span class="lab">{copy.input.epiceneM}</span>
											<small>{copy.input.epiceneCount(fmt(statM.t), years[0])}</small>
											<span class="prop"><i style="width:{Math.round((statM.t / (statF.t + statM.t)) * 100)}%"></i></span>
										</button>
									</div>
								</div>
							{:else if attempted && !stat && q}
								<p class="nf">{copy.input.notFound(query)}</p>
							{/if}</div>
						{:else if profile}
							{#if cur.kind === 'cover'}
								<h2 class="display name">{profile.name}</h2>
							{#if profile.confidential}
								<span class="trend">{copy.cover.trend[profile.trend]}</span>
								<p class="sub">{@html copy.cover.sub(profile.firstYear, fmt(shown), profile.genderLabel)}</p>
								<p class="foot">{copy.cover.confidentialNote}</p>
							{:else}
							<div class="spark"><Sparkline values={profile.series} color={ink} w={300} h={84} years={ds.meta.years} name={profile.name} /></div>
							<div class="axis"><span>{profile.firstYear}</span><span>{profile.lastYear}</span></div>
								<span class="trend">{copy.cover.trend[profile.trend]}</span>
							<p class="sub">{@html copy.cover.sub(profile.firstYear, fmt(shown), profile.genderLabel)}</p>
							{/if}
						{:else if cur.kind === 'region'}
							<h2 class="display">{profile.commLabel}</h2>
							{#if profile.regSum > 0}
								<div class="regions">
									{#each [{ l: 'Flandre', v: profile.shares.fl }, { l: 'Wallonie', v: profile.shares.wa }, { l: 'Bruxelles', v: profile.shares.br }] as r (r.l)}
										<div class="rrow"><span class="rl">{r.l}</span><span class="rbar"><span class="rfill" style="width:{r.v}%"></span></span><span class="rv">{r.v}%</span></div>
									{/each}
								</div>
							{/if}
							<p class="sub">{profile.commCopy}</p>
						{:else if cur.kind === 'map' && provView && geo}
							<h2 class="display small">{copy.map.title}</h2>
							<div class="mapbox"><MapChart {geo} fills={provView.fills} labels={provView.labels} tip={provView.tip} /></div>
							{#if provView.has}
								<div class="legend">
									<span class="lgl">0</span>
									<span class="lgbar" style="background:linear-gradient(90deg, #ece8df, {ink})"></span>
									<span class="lgl">{provView.max}</span>
									<span class="lgcap">{copy.map.legend(profile.name, provView.year)}</span>
								</div>
							{/if}
							<p class="foot">{#if provView.has && provView.top}{@html copy.map.body({ name: profile.name, tops: provView.tops, count: provView.top.count, year: provView.year, masked: provView.shownSum < profile.latestCount, total: fmt(profile.latestCount), g: profile.g })}{:else}{copy.map.rare(profile.name, provView.year)}{/if}</p>
						{:else if cur.kind === 'reine'}
							<h2 class="display">{profile.peakYear}</h2>
							<p class="sub">{@html copy.reine.sub(profile.name, fmt(profile.peakCount))}</p>
						{:else if cur.kind === 'length' && society}
							<h2 class="display">{copy.length.title(profile.nameLen)}</h2>
							<div class="chartbox"><MiniLine values={society.len} years={ds.meta.years} color={ink} refValue={profile.nameLen} refLabel={profile.name} w={300} h={120} fmt={(n) => dec(n)} /></div>
							<p class="sub">{@html copy.length.sub(profile.genderLabel, dec(society.len[0]), dec(society.len.at(-1) ?? 0), profile.name, profile.nameLen)}</p>
						{:else if cur.kind === 'palmares'}
							<h2 class="display small">{profile.lastYear}</h2>
							<div class="palm">
								{#each profile.pal as r (r.n)}
									<div class="prow" class:you={r.you}>
										<span class="pn">{r.rank ? r.rank + '.' : ''} {r.n}</span>
										<span class="pbar"><span class="pfill" style="width:{(r.v / profile.palMax) * 100}%"></span></span>
										<span class="pv">{r.v > 0 ? fmt(r.v) : '< 5'}</span>
									</div>
								{/each}
							</div>
							<p class="foot">{profile.posCopy}</p>
						{:else if cur.kind === 'mixte' && profile.mixte}
							<h2 class="display">{copy.mixte.title}</h2>
							<div class="mix"><span class="mx f" style="width:{profile.mixte.fPct}%">{profile.mixte.fPct}% ♀</span><span class="mx m" style="width:{profile.mixte.mPct}%">{profile.mixte.mPct}% ♂</span></div>
							<p class="sub">{@html copy.mixte.sub(profile.name, profile.mixte.fPct, profile.mixte.mPct)}</p>
						{:else if cur.kind === 'final' && society}
							<h2 class="display small">{copy.final.title}</h2>
							<div class="chartbox"><MiniLine values={society.top10} years={ds.meta.years} color={ink} w={300} h={120} fmt={(n) => dec(n) + '%'} /></div>
							<p class="sub">{@html copy.final.sub(profile.genderLabel, dec(society.top10[0]), dec(society.top10.at(-1) ?? 0))}</p>
						{:else if cur.kind === 'share'}
							<h2 class="display small">{copy.share.title}</h2>
							<p class="sub">{copy.share.sub(profile.name, fmt(profile.total), profile.commLabel.toLowerCase())}</p>
							<div class="rsgrid">
									{#each channels as ch (ch.id)}
										<a class="rs" href={ch.href} target="_blank" rel="noopener" aria-label={ch.label} title={ch.label}><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d={ch.icon} /></svg></a>
									{/each}
									<button type="button" class="rs" onclick={copyLink} aria-label={copy.share.copyBtn} title={copy.share.copyBtn}><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d={ICON.link} /></svg></button>
								</div>
								<button class="again" onclick={restart}>{copy.share.againBtn}</button>
							{#if shareMsg}<p class="foot">{shareMsg}</p>{/if}
						{/if}
						{/if}
					</div>
				{/key}
			</article>

			<div class="byline">{copy.byline}</div>
		</div>
	{/if}
</div>

<style>
	.paper {
		--paper: #ffffff;
		--ink-text: #211f1d;
		--rule: rgba(0, 0, 0, 0.12);
		--accent-ed: #003d60;
		min-height: 100%;
		background: #f0f0ef;
		color: var(--ink-text);
		display: flex;
		justify-content: center;
		padding: 18px 14px;
		font-family: var(--font);
	}
	.msg { margin: auto; color: #555; }

	.ttl { margin: 0; font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: clamp(1.55rem, 7vw, 2.3rem); line-height: 1.1; }
	.ttl em { font-style: italic; color: var(--accent-ed); }
	.lead { margin: 0; color: #5a564f; line-height: 1.55; font-size: 0.95rem; max-width: 34ch; }
	form { pointer-events: auto; display: flex; flex-wrap: wrap; gap: 8px; width: 100%; max-width: 380px; margin-top: 4px; }
	input { flex: 1; min-width: 0; height: 50px; padding: 0 18px; border: 1px solid #c9c6bd; border-radius: 3px; background: #fff; color: var(--ink-text); font: 500 1rem var(--font); outline: none; }
	input:focus { border-color: var(--accent-ed); }
	form button { height: 50px; padding: 0 20px; border: none; border-radius: 3px; background: var(--accent-ed); color: #fff; font: 600 0.9rem var(--font); cursor: pointer; white-space: nowrap; }
	.nf { margin: 2px 0 0; font-size: 0.85rem; color: #6a665e; line-height: 1.5; max-width: 44ch; }

	.epi-slot { width: 100%; min-height: 150px; display: flex; flex-direction: column; align-items: center; }
	.epi { pointer-events: auto; display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 380px; margin-top: 2px; }
	.epilead { margin: 0; font-size: 0.92rem; color: #4a463f; line-height: 1.45; }
	.epirow { display: flex; gap: 10px; }
	.epibtn { flex: 1; display: flex; flex-direction: column; align-items: stretch; gap: 7px; padding: 12px 14px; border: 1px solid #dcd7cc; border-radius: 2px; background: #fff; color: var(--ink-text); cursor: pointer; text-align: left; transition: border-color 0.15s; }
	.epibtn .lab { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 500; font-size: 1.1rem; line-height: 1; }
	.epibtn small { font-size: 0.7rem; color: #8a857c; font-variant-numeric: tabular-nums; }
	.epibtn .prop { height: 3px; background: #eceae2; overflow: hidden; }
	.epibtn .prop > i { display: block; height: 100%; }
	.epibtn.f .prop > i { background: #84569c; }
	.epibtn.m .prop > i { background: #8a7150; }
	.epibtn.f:hover { border-color: #84569c; }
	.epibtn.m:hover { border-color: #8a7150; }

	.shell {
		position: relative;
		width: min(440px, 96vw);
		min-height: 680px;
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: 4px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.bars { display: flex; gap: 4px; padding: 12px 14px 0; z-index: 3; }
	.bar { flex: 1; height: 2px; background: rgba(0, 0, 0, 0.12); overflow: hidden; }
	.bar .fill { display: block; height: 100%; width: 0; background: var(--ink); transition: width 0.4s ease; }
	.bar .fill.on { width: 100%; }
	.zone { position: absolute; top: 0; bottom: 0; border: none; background: transparent; cursor: pointer; z-index: 1; }
	.zone.left { left: 0; width: 30%; }
	.zone.right { left: 30%; right: 0; width: 70%; }
	.chev {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 4;
		width: 32px;
		height: 32px;
		padding: 0;
		border-radius: 50%;
		border: 1px solid var(--rule);
		background: rgba(255, 255, 255, 0.88);
		color: #423e38;
		cursor: pointer;
		display: grid;
		place-items: center;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}
	.chev svg { display: block; }
	.chev.prev { left: 8px; }
	.chev.next { right: 8px; }
	.chev:hover { background: #fff; }
	.card { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 24px 30px 44px; pointer-events: none; }
	.slide { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
	.eyebrow { font-size: 0.68rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; color: var(--accent-ed); }
	.display { margin: 0; font-family: 'Fraunces', Georgia, serif; font-weight: 500; line-height: 1.04; font-size: clamp(2.3rem, 10vw, 3.7rem); color: var(--ink); }
	.display.small { font-size: clamp(1.7rem, 7vw, 2.4rem); }
	.display.name { font-size: clamp(2.6rem, 13vw, 4.6rem); }
	.sub { margin: 0; font-size: 1.02rem; line-height: 1.55; color: #423e38; max-width: 33ch; }
	.foot { margin: 0; font-size: 0.82rem; color: #7a756c; line-height: 1.45; max-width: 34ch; font-variant-numeric: tabular-nums; }
	.card :global(.hl) { font-weight: 700; color: var(--ink); background: color-mix(in srgb, var(--ink) 14%, transparent); padding: 0 4px; border-radius: 3px; font-variant-numeric: tabular-nums; }
	.spark, .chartbox { width: min(300px, 84%); }
	.spark :global(svg) { width: 100%; height: auto; }
	.axis { width: min(300px, 84%); display: flex; justify-content: space-between; font-size: 0.7rem; color: #9a948a; font-variant-numeric: tabular-nums; }
	.trend { font: 700 0.66rem var(--font); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink); border: 1px solid color-mix(in srgb, var(--ink) 38%, transparent); border-radius: 999px; padding: 4px 12px; }
	.mapbox { width: min(330px, 92%); }
	.legend { display: flex; align-items: center; gap: 8px; width: min(300px, 84%); font-size: 0.68rem; color: #9a948a; flex-wrap: wrap; justify-content: center; }
	.lgbar { flex: 1; min-width: 90px; height: 8px; border-radius: 2px; border: 1px solid var(--rule); }
	.lgl { font-variant-numeric: tabular-nums; }
	.lgcap { width: 100%; text-align: center; }

	.regions { width: min(330px, 88%); display: flex; flex-direction: column; gap: 8px; }
	.rrow { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
	.rl { width: 6.2em; text-align: right; color: #5a564f; }
	.rbar { flex: 1; height: 12px; background: rgba(0, 0, 0, 0.07); border-radius: 2px; overflow: hidden; }
	.rfill { display: block; height: 100%; background: var(--ink); border-radius: 2px; }
	.rv { width: 2.8em; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }

	.palm { width: min(340px, 92%); display: flex; flex-direction: column; gap: 5px; }
	.prow { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; padding: 2px 4px; border-radius: 3px; }
	.prow.you { background: color-mix(in srgb, var(--ink) 12%, transparent); }
	.pn { width: 8.4em; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.prow.you .pn { color: var(--ink); font-weight: 700; }
	.pbar { flex: 1; height: 9px; background: rgba(0, 0, 0, 0.06); border-radius: 2px; overflow: hidden; }
	.pfill { display: block; height: 100%; background: #b8b2a6; border-radius: 2px; }
	.prow.you .pfill { background: var(--ink); }
	.pv { width: 3em; text-align: right; color: #7a756c; font-variant-numeric: tabular-nums; }

	.mix { display: flex; width: min(330px, 88%); height: 40px; border-radius: 4px; overflow: hidden; font-size: 0.8rem; font-weight: 700; }
	.mx { display: flex; align-items: center; justify-content: center; color: #fff; min-width: 3.4em; }
	.mx.f { background: #84569c; }
	.mx.m { background: #8a7150; }

	.rsgrid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; pointer-events: auto; max-width: 320px; }
	.rs { display: grid; place-items: center; width: 46px; height: 46px; padding: 0; border: 1px solid #d8d3c8; border-radius: 50%; background: #fff; color: #4a463f; cursor: pointer; text-decoration: none; transition: border-color 0.15s, color 0.15s, background 0.15s; }
	.rs svg { display: block; }
	.rs:hover { border-color: var(--ink); color: #fff; background: var(--ink); }
	.again { pointer-events: auto; margin-top: 12px; padding: 10px 16px; border: none; border-radius: 3px; background: transparent; color: #8a857c; font: 600 0.82rem var(--font); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
	.again:hover { color: var(--ink-text); }
	.dots { position: absolute; top: 22px; right: 16px; font-size: 0.7rem; color: #9a948a; font-variant-numeric: tabular-nums; z-index: 3; }
	.byline { position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 0.64rem; color: #a39d92; pointer-events: none; z-index: 2; }

	.rfill, .pfill { transform-origin: left center; }
	.chartbox :global(path.ln), .spark :global(path.ln) { stroke-dasharray: 1; }
	@keyframes mp-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
	@keyframes mp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
	@media (prefers-reduced-motion: no-preference) {
		.chartbox :global(path.ln), .spark :global(path.ln) { animation: mp-draw 0.9s ease both; }
		.rfill, .pfill { animation: mp-grow 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
	}
</style>
