export function parseBitmapFontBmf(source, sourceName = '<memory>') {
    const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
    const font = {
        schema: 'bitmap-font/v1',
        id: '',
        label: '',
        encoding: 'unknown',
        range: [0, 0],
        width: 0,
        height: 0,
        advance: 0,
        baseline: 0,
        fallback: 63,
        blank: null,
        glyphs: Object.create(null)
    };

    let currentCodePoint = null;
    let currentRows = [];
    let sawHeader = false;

    function fail(lineNumber, message) {
        throw new Error(`${sourceName}:${lineNumber}: ${message}`);
    }

    function parseInteger(value) {
        if (/^0x[0-9a-f]+$/i.test(value)) {
            return Number.parseInt(value.slice(2), 16);
        }
        if (/^U\+[0-9a-f]+$/i.test(value)) {
            return Number.parseInt(value.slice(2), 16);
        }
        if (/^[0-9]+$/.test(value)) {
            return Number.parseInt(value, 10);
        }
        return Number.NaN;
    }

    function commitGlyph(lineNumber) {
        if (currentCodePoint === null) return;
        if (currentRows.length !== font.height) {
            fail(lineNumber, `Glyph 0x${currentCodePoint.toString(16).toUpperCase()} has ${currentRows.length} rows, expected ${font.height}`);
        }
        font.glyphs[String(currentCodePoint)] = currentRows;
        currentCodePoint = null;
        currentRows = [];
    }

    for (let index = 0; index < lines.length; index += 1) {
        const lineNumber = index + 1;
        const rawLine = lines[index];
        const trimmed = rawLine.trim();

        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }

        if (currentCodePoint !== null) {
            if (trimmed === 'END') {
                commitGlyph(lineNumber);
                continue;
            }
            if (!/^[01]+$/.test(trimmed)) {
                fail(lineNumber, 'Glyph row must contain only 0 and 1');
            }
            if (font.width > 0 && trimmed.length !== font.width) {
                fail(lineNumber, `Glyph row has width ${trimmed.length}, expected ${font.width}`);
            }
            currentRows.push(trimmed);
            continue;
        }

        const parts = trimmed.split(/\s+/);
        const keyword = parts[0];

        switch (keyword) {
            case 'BMF': {
                if (parts[1] !== '1') {
                    fail(lineNumber, 'Unsupported BMF version');
                }
                sawHeader = true;
                break;
            }
            case 'NAME': {
                font.id = parts[1] || '';
                break;
            }
            case 'LABEL': {
                font.label = parts.slice(1).join(' ').replaceAll('_', ' ');
                break;
            }
            case 'ENCODING': {
                font.encoding = (parts[1] || 'unknown').toLowerCase();
                break;
            }
            case 'WIDTH': {
                font.width = parseInteger(parts[1]);
                break;
            }
            case 'HEIGHT': {
                font.height = parseInteger(parts[1]);
                break;
            }
            case 'ADVANCE': {
                font.advance = parseInteger(parts[1]);
                break;
            }
            case 'BASELINE': {
                font.baseline = parseInteger(parts[1]);
                break;
            }
            case 'RANGE': {
                font.range = [parseInteger(parts[1]), parseInteger(parts[2])];
                break;
            }
            case 'FALLBACK': {
                font.fallback = parseInteger(parts[1]);
                break;
            }
            case 'GLYPH': {
                if (!sawHeader) fail(lineNumber, 'Missing BMF header');
                if (!font.id) fail(lineNumber, 'Missing NAME');
                if (!font.width || !font.height) fail(lineNumber, 'Missing WIDTH or HEIGHT');
                const codePoint = parseInteger(parts[1]);
                if (!Number.isInteger(codePoint) || codePoint < 0) {
                    fail(lineNumber, `Invalid glyph code point: ${parts[1]}`);
                }
                currentCodePoint = codePoint;
                currentRows = [];
                break;
            }
            default: {
                fail(lineNumber, `Unknown keyword: ${keyword}`);
            }
        }
    }

    commitGlyph(lines.length);

    if (!sawHeader) throw new Error(`${sourceName}: missing BMF header`);
    if (!font.id) throw new Error(`${sourceName}: missing NAME`);
    if (!font.label) font.label = font.id;
    if (!font.advance) font.advance = font.width + 1;
    if (!font.baseline) font.baseline = font.height;
    font.blank = Array.from({ length: font.height }, () => '0'.repeat(font.width));

    return font;
}

export function serializeBitmapFontJson(font) {
    return JSON.stringify({
        schema: font.schema || 'bitmap-font/v1',
        id: font.id,
        label: font.label,
        encoding: font.encoding,
        range: font.range,
        width: font.width,
        height: font.height,
        advance: font.advance,
        baseline: font.baseline,
        blank: font.blank,
        fallback: font.fallback,
        glyphs: Object.fromEntries(
            Object.entries(font.glyphs).sort((left, right) => Number(left[0]) - Number(right[0]))
        )
    }, null, 2) + '\n';
}
