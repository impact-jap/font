#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parseBitmapFontBmf, serializeBitmapFontJson } from '../src/bitmap-font-bmf.mjs';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(rootDir, 'source');
const fontsDir = join(rootDir, 'fonts');
const includeDir = join(rootDir, 'include');
const binaryDir = join(rootDir, 'binary');
const bitmapDir = join(rootDir, 'bitmap');
const cHeaderTool = join(rootDir, 'tools', 'convert-bmf-to-c-header.mjs');
const binaryTool = join(rootDir, 'tools', 'convert-bmf-to-bin.mjs');
const inspectBinaryTool = join(rootDir, 'tools', 'inspect-bmf-bin.mjs');
const bitmapTool = join(rootDir, 'tools', 'convert-bmf-to-bmp.mjs');

await mkdir(fontsDir, { recursive: true });
await mkdir(includeDir, { recursive: true });
await mkdir(binaryDir, { recursive: true });
await mkdir(bitmapDir, { recursive: true });

const sourceFiles = (await readdir(sourceDir))
    .filter((name) => name.endsWith('.bmf'))
    .sort((left, right) => left.localeCompare(right));

if (sourceFiles.length === 0) {
    throw new Error('No .bmf files found in source/');
}

const manifestFonts = [];

for (const fileName of sourceFiles) {
    const inputPath = join(sourceDir, fileName);
    const source = await readFile(inputPath, 'utf8');
    const font = parseBitmapFontBmf(source, inputPath);
    const stem = basename(fileName, '.bmf');
    const jsonPath = join(fontsDir, `${stem}.json`);
    const headerPath = join(includeDir, `${stem}.h`);
    const binaryPath = join(binaryDir, `${stem}.bin`);
    const bitmapPath = join(bitmapDir, `${stem}.bmp`);

    await writeFile(jsonPath, serializeBitmapFontJson(font), 'utf8');
    await runNode(cHeaderTool, inputPath, headerPath);
    await runNode(binaryTool, inputPath, binaryPath);
    await runNode(inspectBinaryTool, binaryPath);
    await runNode(bitmapTool, inputPath, bitmapPath);

    manifestFonts.push({
        id: font.id,
        label: font.label,
        path: `./${stem}.json`,
        source: `../source/${fileName}`,
        cHeader: `../include/${stem}.h`,
        binary: `../binary/${stem}.bin`,
        bitmap: `../bitmap/${stem}.bmp`,
        atlas: {
            format: 'bmp/indexed8',
            columns: 16,
            rows: 16,
            range: [0, 255],
            foregroundIndex: 255,
            backgroundIndex: 0
        },
        encoding: font.encoding,
        width: font.width,
        height: font.height,
        advance: font.advance,
        baseline: font.baseline,
        range: font.range
    });

    console.log(`Generated fonts/${stem}.json`);
    console.log(`Generated include/${stem}.h`);
    console.log(`Generated binary/${stem}.bin`);
    console.log(`Generated bitmap/${stem}.bmp`);
}

const defaultFont = pickDefaultFont(manifestFonts);
const manifest = {
    schema: 'bitmap-font-manifest/v1',
    defaultFont,
    fonts: manifestFonts
};

await writeFile(join(fontsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Generated fonts/manifest.json');

const rootManifest = {
    schema: manifest.schema,
    defaultFont: manifest.defaultFont,
    fonts: manifest.fonts.map((font) => ({
        id: font.id,
        label: font.label,
        source: font.source.replace(/^\.\.\//, ''),
        json: `fonts/${font.path.replace(/^\.\//, '')}`,
        cHeader: font.cHeader.replace(/^\.\.\//, ''),
        binary: font.binary.replace(/^\.\.\//, ''),
        bitmap: font.bitmap.replace(/^\.\.\//, ''),
        atlas: font.atlas,
        encoding: font.encoding,
        width: font.width,
        height: font.height,
        advance: font.advance,
        baseline: font.baseline,
        range: font.range
    }))
};

await writeFile(join(rootDir, 'manifest.json'), JSON.stringify(rootManifest, null, 2) + '\n', 'utf8');
console.log('Generated manifest.json');

function pickDefaultFont(fonts) {
    const preferred = fonts.find((font) => font.id === 'font_terminal_latin1_8x12');
    return (preferred || fonts[0]).id;
}

function runNode(scriptPath, ...args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, ...args], {
            cwd: rootDir,
            stdio: 'inherit'
        });
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${basename(scriptPath)} failed with exit code ${code}`));
        });
    });
}
