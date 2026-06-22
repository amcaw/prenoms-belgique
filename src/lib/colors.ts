export const SERIES = [
	'#ef4444',
	'#10b981',
	'#f59e0b',
	'#a855f7',
	'#3b82f6',
	'#ec4899',
	'#14b8a6',
	'#f97316'
] as const;

function hslToHex(h: number, s: number, l: number): string {
	s /= 100;
	l /= 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		return Math.round(255 * c)
			.toString(16)
			.padStart(2, '0');
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

export function colorForIndex(i: number): string {
	if (i < SERIES.length) return SERIES[i];
	const hue = ((i - SERIES.length) * 137.508 + 18) % 360;
	return hslToHex(hue, 62, 58);
}

export function freeColorSlot(used: Iterable<number>): number {
	const taken = new Set(used);
	let i = 0;
	while (taken.has(i)) i++;
	return i;
}

export function textOn(hex: string): string {
	const n = parseInt(hex.slice(1), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return lum > 0.45 ? '#1a1a1a' : '#ffffff';
}
