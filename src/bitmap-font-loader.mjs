import { parseBitmapFontBmf } from './bitmap-font-bmf.mjs';
import { parseBitmapFontBinary } from './bitmap-font-binary.mjs';

export const DEFAULT_PAGE = window.location.protocol + '//' + window.location.hostname + window.location.pathname;

export async function loadBitmapFont(path) {
    const url = new URL(path, window.location.href);
    const response = await fetch(url.href, { cache: 'no-cache' });

    if (!response.ok) {
        throw new Error(`Failed to load bitmap font: ${url.href}`);
    }

    if (url.pathname.endsWith('.bin') || url.pathname.endsWith('.bmfb')) {
        return parseBitmapFontBinary(await response.arrayBuffer(), url.href);
    }

    const text = await response.text();
    const trimmed = text.trimStart();

    if (trimmed.startsWith('{')) {
        return JSON.parse(text);
    }

    return parseBitmapFontBmf(text, url.href);
}

export function getBitmapGlyph(font, codePoint) {
    return font.glyphs[String(codePoint)]
        || font.glyphs[String(font.fallback || 63)]
        || font.blank;
}

export function hasFullCoverage(font, first = 0, last = 255) {
    for (let codePoint = first; codePoint <= last; codePoint += 1) {
        if (!font.glyphs[String(codePoint)]) return false;
    }
    return true;
}
