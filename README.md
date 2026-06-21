# Bitmap Font BMF Pack

A small byte-oriented bitmap font toolchain.

The source format is `.bmf`: plain 7-bit ASCII text, easy to parse in C, JavaScript, old runtimes, consoles, and build tools.

The generated targets are:

- `fonts/*.json` for web/runtime loading.
- `include/*.h` for C/PS2/Linux/Windows/Symbian-style embedding.
- `binary/*.bin` for compact binary runtime loading.
- `bitmap/*.bmp` for byte-atlas bitmap image loading.

## Fonts

```text
source/font_terminal_ascii_5x7.bmf
source/font_terminal_latin1_8x12.bmf
```

Generated output:

```text
fonts/font_terminal_ascii_5x7.json
fonts/font_terminal_latin1_8x12.json
include/font_terminal_ascii_5x7.h
include/font_terminal_latin1_8x12.h
binary/font_terminal_ascii_5x7.bin
binary/font_terminal_latin1_8x12.bin
bitmap/font_terminal_ascii_5x7.bmp
bitmap/font_terminal_latin1_8x12.bmp
```

## Build

```bash
npm run build
```

Or directly:

```bash
bash build.sh
```

Use `bash build.sh` in CI. This avoids `Permission denied` when `build.sh` is committed without the executable bit from Windows or a ZIP extraction.

Windows:

```bat
build.cmd
```

## Exporters

```bash
node tools/convert-bmf-to-json.mjs source/font_terminal_ascii_5x7.bmf fonts/font_terminal_ascii_5x7.json
node tools/convert-bmf-to-c-header.mjs source/font_terminal_ascii_5x7.bmf include/font_terminal_ascii_5x7.h
node tools/convert-bmf-to-bin.mjs source/font_terminal_ascii_5x7.bmf binary/font_terminal_ascii_5x7.bin
node tools/convert-bmf-to-bmp.mjs source/font_terminal_ascii_5x7.bmf bitmap/font_terminal_ascii_5x7.bmp
```

Batch exporter:

```bash
node tools/build-bitmap-fonts.mjs
```

## BMF text format

```text
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

## Binary format

The binary format starts with a fixed 128-byte header.

```text
magic:      BMFB
version:    1.0
alignment:  16 bytes
sections:   glyph index, glyph data, string table
rows:       little-endian row masks
```

All offsets in the header are absolute file offsets.

## BMP atlas format

The BMP exporter writes an 8-bit indexed BMP:

```text
format:       BMP indexed 8-bit
palette 0:    black background
palette 255:  white glyph pixels
grid:         16 columns x 16 rows
range:        byte values 0..255
```

Each codepoint maps to:

```text
x = codepoint % 16
y = codepoint / 16
```

For ASCII-only fonts, entries `128..255` are blank.

## Web test

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080/
```
