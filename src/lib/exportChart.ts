const SVG_NS = 'http://www.w3.org/2000/svg';

const STYLE_PROPS = [
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-linecap',
	'stroke-linejoin',
	'opacity',
	'font-family',
	'font-size',
	'font-weight',
	'font-style',
	'text-anchor',
	'letter-spacing'
];

function inlineStyles(src: Element, dst: Element) {
	const cs = getComputedStyle(src);
	let style = '';
	for (const p of STYLE_PROPS) {
		const v = cs.getPropertyValue(p);
		if (v) style += `${p}:${v};`;
	}
	dst.setAttribute('style', style);
	const sc = src.children;
	const dc = dst.children;
	for (let i = 0; i < sc.length; i++) inlineStyles(sc[i], dc[i]);
}

function toBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

const fontCache = new Map<string, string>();

async function fontFaceCss(family: string, weights: string[]): Promise<string> {
	const key = `${family}:${weights.join(',')}`;
	const cached = fontCache.get(key);
	if (cached !== undefined) return cached;
	const fam = family.replace(/ /g, '+') + (weights.length ? `:wght@${weights.join(';')}` : '');
	const css = await fetch(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`).then((r) =>
		r.text()
	);
	const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
	const urlRe = /url\((https:\/\/[^)]+\.woff2)\)/;
	let out = '';
	for (const face of faces) {
		const m = face.match(urlRe);
		if (!m) continue;
		const buf = await fetch(m[1]).then((r) => r.arrayBuffer());
		out += face.replace(urlRe, `url(data:font/woff2;base64,${toBase64(buf)})`);
	}
	fontCache.set(key, out);
	return out;
}

export interface ExportOptions {
	filename: string;
	background?: string;
	scale?: number;
	square?: boolean;
	fonts?: { family: string; weights: string[] }[];
}

export async function exportSvgAsJpg(svg: SVGSVGElement, opts: ExportOptions): Promise<void> {
	const { filename, background = '#ffffff', scale = 2, square = false, fonts = [] } = opts;

	const clone = svg.cloneNode(true) as SVGSVGElement;
	inlineStyles(svg, clone);

	let fontCss = '';
	for (const f of fonts) {
		try {
			fontCss += await fontFaceCss(f.family, f.weights);
		} catch {
			void 0;
		}
	}
	if (fontCss) {
		const styleEl = document.createElementNS(SVG_NS, 'style');
		styleEl.textContent = fontCss;
		clone.insertBefore(styleEl, clone.firstChild);
	}

	const rect = svg.getBoundingClientRect();
	const w = Math.ceil(rect.width);
	const h = Math.ceil(rect.height);
	clone.setAttribute('width', String(w));
	clone.setAttribute('height', String(h));
	clone.setAttribute('xmlns', SVG_NS);

	const xml = new XMLSerializer().serializeToString(clone);
	const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

	const img = new Image();
	img.width = w;
	img.height = h;
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = () => reject(new Error('SVG render failed'));
		img.src = url;
	});

	const side = Math.max(w, h);
	const cw = square ? side : w;
	const ch = square ? side : h;
	const fit = square ? Math.min(cw / w, ch / h) : 1;
	const dw = w * fit;
	const dh = h * fit;
	const ox = (cw - dw) / 2;
	const oy = (ch - dh) / 2;

	const canvas = document.createElement('canvas');
	canvas.width = cw * scale;
	canvas.height = ch * scale;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.setTransform(scale, 0, 0, scale, 0, 0);
	ctx.drawImage(img, ox, oy, dw, dh);

	const a = document.createElement('a');
	a.href = canvas.toDataURL('image/jpeg', 0.95);
	a.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
	a.click();
}

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export async function exportSquareFromContainer(
	container: HTMLElement,
	opts: ExportOptions & { size?: number }
): Promise<void> {
	const size = opts.size ?? 1080;
	const prev = container.getAttribute('style') ?? '';
	Object.assign(container.style, {
		position: 'fixed',
		left: '-99999px',
		top: '0px',
		width: `${size}px`,
		height: `${size}px`,
		maxWidth: 'none',
		maxHeight: 'none',
		flex: 'none',
		padding: '0',
		visibility: 'hidden'
	});
	try {
		for (let i = 0; i < 30; i++) {
			await raf();
			const s = container.querySelector('svg');
			if (s && Math.abs(s.clientWidth - size) < 4 && Math.abs(s.clientHeight - size) < 4) break;
		}
		const svg = container.querySelector('svg') as SVGSVGElement | null;
		if (svg) await exportSvgAsJpg(svg, opts);
	} finally {
		container.setAttribute('style', prev);
	}
}
