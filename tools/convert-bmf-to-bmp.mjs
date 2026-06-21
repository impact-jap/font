#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseBitmapFontBmf } from '../src/bitmap-font-bmf.mjs';

const [, , inputPath, outputPath, ...args] = process.argv;

if (!inputPath || !outputPath) {
    console.error('usage: node tools/convert-bmf-to-bmp.mjs <input.bmf> <output.bmp> [--scale N]');
    process.exit(1);
}

const scale = parseScale(args);
const source = await readFile(inputPath, 'utf8');
const font = parseBitmapFontBmf(source, inputPath);
const atlas = buildByteAtlas(font, scale);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, encodeIndexedBmp(atlas.width, atlas.height, atlas.pixels));

console.log(`Generated ${outputPath}`);
console.log(`  ${atlas.width}x${atlas.height}, 8-bit indexed BMP, 16x16 byte atlas, scale=${scale}`);
console.log(`  cell=${atlas.cellSize}x${atlas.cellSize}, range=0..255`);

function parseScale(values) {
    const index = values.indexOf('--scale');
    if (index === -1) return 1;
    const value = Number(values[index + 1]);
    if (!Number.isInteger(value) || value < 1 || value > 16) {
        throw new Error('--scale must be an integer from 1 to 16');
    }
    return value;
}

function buildByteAtlas(font, scaleValue) {
    const columns = 16;
    const rows = 16;
    const baseCellSize = Math.max(font.width, font.height, font.advance) + 2;
    const cellSize = baseCellSize * scaleValue;
    const width = columns * cellSize;
    const height = rows * cellSize;
    const pixels = new Uint8Array(width * height);

    for (let codePoint = 0; codePoint <= 255; codePoint += 1) {
        const glyph = font.glyphs[String(codePoint)] || font.blank;
        const gridX = codePoint % columns;
        const gridY = Math.floor(codePoint / columns);
        const cellX = gridX * cellSize;
        const cellY = gridY * cellSize;
        const glyphWidth = font.width * scaleValue;
        const glyphHeight = font.height * scaleValue;
        const glyphX = cellX + Math.floor((cellSize - glyphWidth) / 2);
        const glyphY = cellY + Math.floor((cellSize - glyphHeight) / 2);

        drawGlyph(pixels, width, height, glyph, glyphX, glyphY, scaleValue);
    }

    return { width, height, pixels, cellSize };
}

function drawGlyph(pixels, imageWidth, imageHeight, glyph, x, y, scaleValue) {
    for (let row = 0; row < glyph.length; row += 1) {
        const bits = glyph[row];
        for (let col = 0; col < bits.length; col += 1) {
            if (bits[col] !== '1') continue;
            drawScaledPixel(pixels, imageWidth, imageHeight, x + col * scaleValue, y + row * scaleValue, scaleValue);
        }
    }
}

function drawScaledPixel(pixels, imageWidth, imageHeight, x, y, scaleValue) {
    for (let yy = 0; yy < scaleValue; yy += 1) {
        const targetY = y + yy;
        if (targetY < 0 || targetY >= imageHeight) continue;
        for (let xx = 0; xx < scaleValue; xx += 1) {
            const targetX = x + xx;
            if (targetX < 0 || targetX >= imageWidth) continue;
            pixels[targetY * imageWidth + targetX] = 255;
        }
    }
}

function encodeIndexedBmp(width, height, pixels) {
    const fileHeaderSize = 14;
    const dibHeaderSize = 40;
    const paletteSize = 256 * 4;
    const pixelOffset = fileHeaderSize + dibHeaderSize + paletteSize;
    const rowStride = align4(width);
    const imageSize = rowStride * height;
    const fileSize = pixelOffset + imageSize;
    const output = Buffer.alloc(fileSize, 0);

    output.write('BM', 0, 'ascii');
    output.writeUInt32LE(fileSize, 2);
    output.writeUInt32LE(pixelOffset, 10);

    output.writeUInt32LE(dibHeaderSize, 14);
    output.writeInt32LE(width, 18);
    output.writeInt32LE(height, 22);
    output.writeUInt16LE(1, 26);
    output.writeUInt16LE(8, 28);
    output.writeUInt32LE(0, 30);
    output.writeUInt32LE(imageSize, 34);
    output.writeInt32LE(2835, 38);
    output.writeInt32LE(2835, 42);
    output.writeUInt32LE(256, 46);
    output.writeUInt32LE(2, 50);

    const paletteOffset = fileHeaderSize + dibHeaderSize;
    for (let index = 0; index < 256; index += 1) {
        const value = index;
        const offset = paletteOffset + index * 4;
        output[offset + 0] = value;
        output[offset + 1] = value;
        output[offset + 2] = value;
        output[offset + 3] = 0;
    }

    for (let y = 0; y < height; y += 1) {
        const sourceY = height - 1 - y;
        const sourceOffset = sourceY * width;
        const targetOffset = pixelOffset + y * rowStride;
        for (let x = 0; x < width; x += 1) {
            output[targetOffset + x] = pixels[sourceOffset + x];
        }
    }

    return output;
}

function align4(value) {
    return (value + 3) & ~3;
}
