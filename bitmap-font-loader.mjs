export const DEFAULT_PAGE = window.location.protocol + '//' + window.location.hostname + window.location.pathname;

export async function loadBitmapFont(path) {
    const url = new URL(path, window.location.href);
    const response = await fetch(url.href, { cache: 'no-cache' });

    if (!response.ok) {
        throw new Error(`Failed to load bitmap font: ${url.href}`);
    }

    return response.json();
}

export function getBitmapGlyph(font, codePoint) {
    return font.glyphs[String(codePoint)]
        || font.glyphs[String(font.fallback || 63)]
        || font.blank;
}
