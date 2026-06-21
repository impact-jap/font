#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseBitmapFontBmf } from '../src/bitmap-font-bmf.mjs';
import { serializeBitmapFontBinary } from '../src/bitmap-font-binary.mjs';

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
    console.error('Usage: node tools/convert-bmf-to-bin.mjs <input.bmf> <output.bin>');
    process.exit(1);
}

const source = await readFile(inputPath, 'utf8');
const font = parseBitmapFontBmf(source, inputPath);
const buffer = serializeBitmapFontBinary(font);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, buffer);
console.log(`Generated ${outputPath}`);
