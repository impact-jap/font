# Bitmap Font BMF Pack

This pack uses `.bmf` as the editable source format and generates runtime files from it.

The source files stay plain 7-bit ASCII and line-oriented so they can be parsed on web, PS2 C code, Windows, Linux, Android, Symbian-era code, or any runtime with basic file reading.

## Structure

```txt
source/
  font_terminal_ascii_5x7.bmf
  font_terminal_latin1_8x12.bmf

fonts/
  font_terminal_ascii_5x7.json
  font_terminal_latin1_8x12.json
  manifest.json

include/
  font_terminal_ascii_5x7.h
  font_terminal_latin1_8x12.h

src/
  bitmap-font-bmf.mjs
  bitmap-font-loader.mjs

tools/
  build-bitmap-fonts.mjs
  convert-bmf-to-json.mjs
  convert-bmf-to-c-header.mjs

.github/workflows/
  build-fonts.yml

build.sh
build.cmd
index.html
manifest.json
package.json
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
BASELINE 6
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

## Build everything

```bash
./build.sh
```

On Windows:

```bat
build.cmd
```

Or with npm:

```bash
npm run build
```

This generates:

```txt
fonts/*.json
include/*.h
fonts/manifest.json
manifest.json
```

## Build only JSON

```bash
npm run build:json
```

## Build only C headers

```bash
npm run build:c
```

## Single-file exporters

```bash
node tools/convert-bmf-to-json.mjs source/font_terminal_ascii_5x7.bmf fonts/font_terminal_ascii_5x7.json
node tools/convert-bmf-to-c-header.mjs source/font_terminal_ascii_5x7.bmf include/font_terminal_ascii_5x7.h
```

## Web usage

```js
import { loadBitmapFont, getBitmapGlyph } from './src/bitmap-font-loader.mjs';

const font = await loadBitmapFont('source/font_terminal_ascii_5x7.bmf');
const glyph = getBitmapGlyph(font, 'A'.codePointAt(0));
```

`loadBitmapFont()` accepts both generated `.json` files and source `.bmf` files.

## C usage

```c
#include "include/font_terminal_ascii_5x7.h"

const font_terminal_ascii_5x7_row_t *glyph = font_terminal_ascii_5x7_glyph('A');
uint8_t pixel = font_terminal_ascii_5x7_pixel(glyph, 2, 0);
```

The C header stores each row as a compact integer mask:

```txt
01110 -> 0x0E
10001 -> 0x11
11111 -> 0x1F
```

For widths up to 8 pixels, the row type is `uint8_t`. For widths up to 16 pixels, it becomes `uint16_t`. For widths up to 32 pixels, it becomes `uint32_t`.

## GitHub Actions

The workflow at `.github/workflows/build-fonts.yml` runs:

```bash
./build.sh
git diff --exit-code -- fonts include
```

That means CI fails if `.bmf` sources were changed but generated JSON/C header files were not committed.

It also uploads the generated dist files as a workflow artifact named `bitmap-font-dist`.

## Serve locally

```bash
python -m http.server 8080
```

Open:

```txt
http://localhost:8080/
```
