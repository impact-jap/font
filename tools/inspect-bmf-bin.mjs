#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { inspectBitmapFontBinary, parseBitmapFontBinary } from '../src/bitmap-font-binary.mjs';

const [, , inputPath] = process.argv;

if (!inputPath) {
    console.error('Usage: node tools/inspect-bmf-bin.mjs <input.bin>');
    process.exit(1);
}

const buffer = await readFile(inputPath);
const info = inspectBitmapFontBinary(buffer);
parseBitmapFontBinary(buffer, inputPath);
console.log(JSON.stringify(info, null, 2));
