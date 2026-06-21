# Bitmap Font BMF Pack

This pack uses a small source format for bitmap fonts and generated JSON files for web runtime usage.

## Structure

```txt
source/
  font_terminal_ascii_5x7.bmf
  font_terminal_latin1_8x12.bmf

fonts/
  font_terminal_ascii_5x7.json
  font_terminal_latin1_8x12.json
  manifest.json

src/
  bitmap-font-bmf.mjs
  bitmap-font-loader.mjs

tools/
  convert-bmf-to-json.mjs
```

## Source format

```txt
BMF 1
NAME font_terminal_ascii_5x7
LABEL Terminal_ASCII_5x7
ENCODING ASCII
WIDTH 5
HEIGHT 7
ADVANCE 6
BASELINE 7
RANGE 0x00 0x7F
FALLBACK 0x3F

GLYPH 0x41 A
01110
10001
10001
11111
10001
10001
10001
END
```

The `.bmf` files intentionally stay 7-bit ASCII. This makes them easy to parse in C, JavaScript, Java, Rust, Python, or old platforms.

## Web usage

```js
import { loadBitmapFont, getBitmapGlyph } from './src/bitmap-font-loader.mjs';

const font = await loadBitmapFont('source/font_terminal_ascii_5x7.bmf');
const glyph = getBitmapGlyph(font, 'A'.codePointAt(0));
```

## Build JSON dist

```bash
node tools/convert-bmf-to-json.mjs source/font_terminal_ascii_5x7.bmf fonts/font_terminal_ascii_5x7.json
node tools/convert-bmf-to-json.mjs source/font_terminal_latin1_8x12.bmf fonts/font_terminal_latin1_8x12.json
```

Or:

```bash
npm run build
```

## Serve locally

```bash
python -m http.server 8080
```

Open:

```txt
http://localhost:8080/
```
