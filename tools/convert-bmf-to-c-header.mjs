#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseBitmapFontBmf } from '../src/bitmap-font-bmf.mjs';

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
    console.error('Usage: node tools/convert-bmf-to-c-header.mjs <input.bmf> <output.h>');
    process.exit(1);
}

const source = await readFile(inputPath, 'utf8');
const font = parseBitmapFontBmf(source, inputPath);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializeBitmapFontHeader(font), 'utf8');
console.log(`Generated ${outputPath}`);

function serializeBitmapFontHeader(font) {
    validateFontForHeader(font);

    const symbol = makeCSymbol(font.id);
    const upper = symbol.toUpperCase();
    const guard = `${upper}_H`;
    const first = font.range[0];
    const last = font.range[1];
    const count = last - first + 1;
    const rowType = selectRowType(font.width);
    const lines = [];

    lines.push('#ifndef ' + guard);
    lines.push('#define ' + guard);
    lines.push('');
    lines.push('#include <stdint.h>');
    lines.push('');
    lines.push(`typedef ${rowType} ${symbol}_row_t;`);
    lines.push('');
    lines.push(`#define ${upper}_WIDTH ${font.width}`);
    lines.push(`#define ${upper}_HEIGHT ${font.height}`);
    lines.push(`#define ${upper}_ADVANCE ${font.advance}`);
    lines.push(`#define ${upper}_BASELINE ${font.baseline}`);
    lines.push(`#define ${upper}_FIRST ${formatHex(first, 4)}`);
    lines.push(`#define ${upper}_LAST ${formatHex(last, 4)}`);
    lines.push(`#define ${upper}_COUNT ${count}`);
    lines.push(`#define ${upper}_FALLBACK ${formatHex(font.fallback, 4)}`);
    lines.push('');
    lines.push(`static const ${symbol}_row_t ${symbol}_blank[${font.height}] = {`);
    for (let row = 0; row < font.height; row += 1) {
        lines.push(`    ${formatMask(0, font.width)},`);
    }
    lines.push('};');
    lines.push('');
    lines.push(`static const ${symbol}_row_t ${symbol}_glyphs[${count}][${font.height}] = {`);

    for (let codePoint = first; codePoint <= last; codePoint += 1) {
        const glyph = font.glyphs[String(codePoint)] || font.blank;
        lines.push(`    /* ${formatHex(codePoint, 4)} */ {`);
        for (const row of glyph) {
            lines.push(`        ${formatMask(rowToMask(row), font.width)},`);
        }
        lines.push('    },');
    }

    lines.push('};');
    lines.push('');
    lines.push(`static inline const ${symbol}_row_t *${symbol}_glyph(uint32_t code_point)`);
    lines.push('{');
    if (first === 0) {
        lines.push(`    if (code_point <= ${upper}_LAST) {`);
    } else {
        lines.push(`    if (code_point >= ${upper}_FIRST && code_point <= ${upper}_LAST) {`);
    }
    lines.push(`        return ${symbol}_glyphs[code_point - ${upper}_FIRST];`);
    lines.push('    }');
    if (font.fallback >= first && font.fallback <= last) {
        lines.push(`    return ${symbol}_glyphs[${upper}_FALLBACK - ${upper}_FIRST];`);
    } else {
        lines.push(`    return ${symbol}_blank;`);
    }
    lines.push('}');
    lines.push('');
    lines.push(`static inline uint8_t ${symbol}_pixel(const ${symbol}_row_t *glyph, uint8_t x, uint8_t y)`);
    lines.push('{');
    lines.push(`    if (x >= ${upper}_WIDTH || y >= ${upper}_HEIGHT) {`);
    lines.push('        return 0;');
    lines.push('    }');
    lines.push(`    return (uint8_t)((glyph[y] >> ((${upper}_WIDTH - 1u) - x)) & 1u);`);
    lines.push('}');
    lines.push('');
    lines.push('#endif');
    lines.push('');

    return lines.join('\n');
}

function validateFontForHeader(font) {
    if (!Array.isArray(font.range) || font.range.length !== 2) {
        throw new Error('Font range is required');
    }
    const [first, last] = font.range;
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || last < first) {
        throw new Error('Invalid font range');
    }
    if (!Number.isInteger(font.width) || font.width < 1 || font.width > 32) {
        throw new Error('C header exporter supports glyph widths from 1 to 32 pixels');
    }
    if (!Number.isInteger(font.height) || font.height < 1 || font.height > 255) {
        throw new Error('C header exporter supports glyph heights from 1 to 255 pixels');
    }
}

function makeCSymbol(value) {
    const symbol = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!symbol) return 'bitmap_font';
    if (/^[0-9]/.test(symbol)) return `font_${symbol}`;
    return symbol;
}

function selectRowType(width) {
    if (width <= 8) return 'uint8_t';
    if (width <= 16) return 'uint16_t';
    return 'uint32_t';
}

function rowToMask(row) {
    let value = 0;
    for (let index = 0; index < row.length; index += 1) {
        value = (value << 1) | (row[index] === '1' ? 1 : 0);
    }
    return value >>> 0;
}

function formatMask(value, width) {
    const digits = width <= 8 ? 2 : width <= 16 ? 4 : 8;
    return formatHex(value, digits);
}

function formatHex(value, minDigits) {
    return '0x' + Number(value).toString(16).toUpperCase().padStart(minDigits, '0');
}
