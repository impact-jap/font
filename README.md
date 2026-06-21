# Terminal Bitmap Font Pack

This pack separates the renderer from the font data.

## Files

- `index.html`: bitmap font tester.
- `fonts/manifest.json`: font registry.
- `fonts/font_terminal_ascii_5x7.json`: compact ASCII-only font, based on the original 0..127 mapping.
- `fonts/font_terminal_latin1_6x8.json`: compact Latin-1 test font.
- `fonts/font_terminal_latin1_8x8.json`: retro Latin-1 test font.
- `fonts/font_terminal_latin1_8x12.json`: recommended Latin-1 font for accented text.
- `fonts/font_terminal_latin1_8x16.json`: taller Latin-1 font for terminal-style rendering.

## Local use

Opening `index.html` directly may work in some browsers, but others block `fetch()` from local JSON files.

Recommended local test:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

If direct local loading is blocked, use the file input shown by the page and select the JSON files from the `fonts` folder.

## Byte range

- `0..255` is the valid byte range.
- `256` is outside the byte range.
- `0..31`, `127`, and `128..159` are control ranges in this pack and are blank.
- `160` is NBSP and is blank.
- `161..255` contains Latin-1 printable glyphs.
