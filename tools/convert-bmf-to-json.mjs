#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { parseBitmapFontBmf, serializeBitmapFontJson } from '../src/bitmap-font-bmf.mjs';

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
    console.error('Usage: node tools/convert-bmf-to-json.mjs <input.bmf> <output.json>');
    process.exit(1);
}

const source = await readFile(inputPath, 'utf8');
const font = parseBitmapFontBmf(source, inputPath);
await writeFile(outputPath, serializeBitmapFontJson(font), 'utf8');
console.log(`Generated ${outputPath}`);
