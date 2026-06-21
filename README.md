# Bitmap Font BMF Pack

This pack uses one editable source format and generates multiple runtime targets.

```text
source/*.bmf  -> human-readable source
fonts/*.json  -> web/runtime JSON dist
include/*.h   -> C/PS2/static row-mask headers
binary/*.bin  -> aligned binary font format
```

## Build

```sh
./build.sh
```

Windows:

```bat
build.cmd
```

NPM:

```sh
npm run build
npm run build:json
npm run build:c
npm run build:bin
```

## Included fonts

```text
source/font_terminal_ascii_5x7.bmf
source/font_terminal_latin1_8x12.bmf
```

Generated files:

```text
fonts/font_terminal_ascii_5x7.json
fonts/font_terminal_latin1_8x12.json
include/font_terminal_ascii_5x7.h
include/font_terminal_latin1_8x12.h
binary/font_terminal_ascii_5x7.bin
binary/font_terminal_latin1_8x12.bin
```

## Binary format

The binary format is intentionally simple for old platforms, C, PS2, Windows, Linux, Symbian, Android, and web loaders.

All integer fields are little-endian. All section offsets are absolute file offsets. Sections are 16-byte aligned.

### Header

```text
Offset  Size  Field
0x00    4     magic = "BMFB"
0x04    2     version_major = 1
0x06    2     version_minor = 0
0x08    2     header_size = 128
0x0A    2     alignment = 16
0x0C    4     file_size
0x10    4     flags
0x14    4     encoding_id
0x18    4     first_code_point
0x1C    4     last_code_point
0x20    4     glyph_count
0x24    4     fallback_code_point
0x28    2     width
0x2A    2     height
0x2C    2     advance
0x2E    2     baseline
0x30    2     row_stride
0x32    2     glyph_record_size = 16
0x34    4     glyph_index_offset
0x38    4     glyph_index_size
0x3C    4     glyph_data_offset
0x40    4     glyph_data_size
0x44    4     string_table_offset
0x48    4     string_table_size
0x4C    4     name_offset
0x50    4     label_offset
0x54    4     encoding_name_offset
0x58    4     reserved_0
0x5C    4     reserved_1
0x60    32    reserved_padding
```

### Glyph record

Each glyph record is 16 bytes:

```text
Offset  Size  Field
0x00    4     code_point
0x04    4     data_offset
0x08    2     width
0x0A    2     height
0x0C    2     advance
0x0E    2     flags
```

### Glyph row data

Rows are stored as little-endian row masks. The leftmost pixel is read with:

```c
pixel = (row_mask >> ((width - 1u) - x)) & 1u;
```

For example, a 5-pixel row:

```text
01110 -> 0x0E
10001 -> 0x11
11111 -> 0x1F
```

## Inspect a binary font

```sh
node tools/inspect-bmf-bin.mjs binary/font_terminal_ascii_5x7.bin
```

## Web loader

The web loader accepts `.json`, source `.bmf`, and binary `.bin` using the same API:

```js
import { loadBitmapFont, getBitmapGlyph } from './src/bitmap-font-loader.mjs';

const font = await loadBitmapFont('binary/font_terminal_ascii_5x7.bin');
const glyph = getBitmapGlyph(font, 0x41);
```

The loader keeps the local/web-safe page helper:

```js
export const DEFAULT_PAGE = window.location.protocol + '//' + window.location.hostname + window.location.pathname;
```

## CI

The GitHub Actions workflow runs:

```sh
./build.sh
node tools/inspect-bmf-bin.mjs binary/font_terminal_ascii_5x7.bin
node tools/inspect-bmf-bin.mjs binary/font_terminal_latin1_8x12.bin
git diff --exit-code -- fonts include binary manifest.json
```

If generated artifacts are stale, CI fails.
