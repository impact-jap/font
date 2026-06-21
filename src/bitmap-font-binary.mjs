const MAGIC = 'BMFB';
const VERSION_MAJOR = 1;
const VERSION_MINOR = 0;
const HEADER_SIZE = 0x80;
const ALIGNMENT = 16;
const GLYPH_RECORD_SIZE = 16;

const ENCODING_IDS = Object.freeze({
    ascii: 1,
    'iso-8859-1': 2,
    latin1: 2,
    unicode: 3,
    unknown: 0
});

const ENCODING_NAMES = Object.freeze({
    0: 'unknown',
    1: 'ascii',
    2: 'iso-8859-1',
    3: 'unicode'
});

export function serializeBitmapFontBinary(font) {
    validateFont(font);

    const first = font.range[0];
    const last = font.range[1];
    const glyphCount = last - first + 1;
    const rowStride = Math.ceil(font.width / 8);
    const glyphDataSize = rowStride * font.height * glyphCount;
    const glyphIndexSize = GLYPH_RECORD_SIZE * glyphCount;
    const glyphIndexOffset = align(HEADER_SIZE, ALIGNMENT);
    const glyphDataOffset = align(glyphIndexOffset + glyphIndexSize, ALIGNMENT);
    const stringTableOffset = align(glyphDataOffset + glyphDataSize, ALIGNMENT);
    const strings = buildStringTable([font.id, font.label || font.id, font.encoding || 'unknown']);
    const fileSize = align(stringTableOffset + strings.buffer.length, ALIGNMENT);

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    writeAscii(bytes, 0x00, MAGIC);
    writeU16(view, 0x04, VERSION_MAJOR);
    writeU16(view, 0x06, VERSION_MINOR);
    writeU16(view, 0x08, HEADER_SIZE);
    writeU16(view, 0x0A, ALIGNMENT);
    writeU32(view, 0x0C, fileSize);
    writeU32(view, 0x10, 0x00000001); // Row masks are stored little-endian, lower-bit packed.
    writeU32(view, 0x14, encodingToId(font.encoding));
    writeU32(view, 0x18, first);
    writeU32(view, 0x1C, last);
    writeU32(view, 0x20, glyphCount);
    writeU32(view, 0x24, font.fallback || 63);
    writeU16(view, 0x28, font.width);
    writeU16(view, 0x2A, font.height);
    writeU16(view, 0x2C, font.advance || font.width);
    writeU16(view, 0x2E, font.baseline || font.height);
    writeU16(view, 0x30, rowStride);
    writeU16(view, 0x32, GLYPH_RECORD_SIZE);
    writeU32(view, 0x34, glyphIndexOffset);
    writeU32(view, 0x38, glyphIndexSize);
    writeU32(view, 0x3C, glyphDataOffset);
    writeU32(view, 0x40, glyphDataSize);
    writeU32(view, 0x44, stringTableOffset);
    writeU32(view, 0x48, strings.buffer.length);
    writeU32(view, 0x4C, strings.offsets[0]);
    writeU32(view, 0x50, strings.offsets[1]);
    writeU32(view, 0x54, strings.offsets[2]);

    let dataCursor = glyphDataOffset;
    for (let index = 0; index < glyphCount; index += 1) {
        const codePoint = first + index;
        const glyph = font.glyphs[String(codePoint)] || font.blank;
        const recordOffset = glyphIndexOffset + index * GLYPH_RECORD_SIZE;

        writeU32(view, recordOffset + 0x00, codePoint);
        writeU32(view, recordOffset + 0x04, dataCursor);
        writeU16(view, recordOffset + 0x08, font.width);
        writeU16(view, recordOffset + 0x0A, font.height);
        writeU16(view, recordOffset + 0x0C, font.advance || font.width);
        writeU16(view, recordOffset + 0x0E, 0);

        writeGlyphData(bytes, dataCursor, glyph, font.width, font.height, rowStride);
        dataCursor += rowStride * font.height;
    }

    bytes.set(strings.buffer, stringTableOffset);

    return Buffer.from(buffer);
}

export function parseBitmapFontBinary(arrayBuffer, sourceName = '<memory>') {
    const buffer = arrayBuffer instanceof ArrayBuffer
        ? arrayBuffer
        : arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    function fail(message) {
        throw new Error(`${sourceName}: ${message}`);
    }

    if (buffer.byteLength < HEADER_SIZE) fail('file is smaller than the fixed header');
    if (readAscii(bytes, 0x00, 4) !== MAGIC) fail('invalid magic header');

    const versionMajor = view.getUint16(0x04, true);
    const versionMinor = view.getUint16(0x06, true);
    const headerSize = view.getUint16(0x08, true);
    const alignment = view.getUint16(0x0A, true);
    const fileSize = view.getUint32(0x0C, true);
    const encodingId = view.getUint32(0x14, true);
    const first = view.getUint32(0x18, true);
    const last = view.getUint32(0x1C, true);
    const glyphCount = view.getUint32(0x20, true);
    const fallback = view.getUint32(0x24, true);
    const width = view.getUint16(0x28, true);
    const height = view.getUint16(0x2A, true);
    const advance = view.getUint16(0x2C, true);
    const baseline = view.getUint16(0x2E, true);
    const rowStride = view.getUint16(0x30, true);
    const glyphRecordSize = view.getUint16(0x32, true);
    const glyphIndexOffset = view.getUint32(0x34, true);
    const glyphIndexSize = view.getUint32(0x38, true);
    const glyphDataOffset = view.getUint32(0x3C, true);
    const glyphDataSize = view.getUint32(0x40, true);
    const stringTableOffset = view.getUint32(0x44, true);
    const stringTableSize = view.getUint32(0x48, true);
    const nameOffset = view.getUint32(0x4C, true);
    const labelOffset = view.getUint32(0x50, true);
    const encodingNameOffset = view.getUint32(0x54, true);

    if (versionMajor !== VERSION_MAJOR) fail(`unsupported major version ${versionMajor}`);
    if (versionMinor !== VERSION_MINOR) fail(`unsupported minor version ${versionMinor}`);
    if (headerSize !== HEADER_SIZE) fail(`unsupported header size ${headerSize}`);
    if (alignment !== ALIGNMENT) fail(`unsupported alignment ${alignment}`);
    if (fileSize > buffer.byteLength) fail('declared file size is larger than buffer');
    if (glyphRecordSize !== GLYPH_RECORD_SIZE) fail(`unsupported glyph record size ${glyphRecordSize}`);
    if (glyphCount !== (last - first + 1)) fail('glyph count does not match range');
    if (glyphIndexSize !== glyphCount * GLYPH_RECORD_SIZE) fail('glyph index size does not match glyph count');
    checkRange(glyphIndexOffset, glyphIndexSize, buffer.byteLength, fail, 'glyph index');
    checkRange(glyphDataOffset, glyphDataSize, buffer.byteLength, fail, 'glyph data');
    checkRange(stringTableOffset, stringTableSize, buffer.byteLength, fail, 'string table');

    const id = readCString(bytes, stringTableOffset, stringTableSize, nameOffset) || 'bitmap_font';
    const label = readCString(bytes, stringTableOffset, stringTableSize, labelOffset) || id;
    const encodingName = readCString(bytes, stringTableOffset, stringTableSize, encodingNameOffset) || ENCODING_NAMES[encodingId] || 'unknown';
    const blank = Array.from({ length: height }, () => '0'.repeat(width));
    const glyphs = Object.create(null);

    for (let index = 0; index < glyphCount; index += 1) {
        const recordOffset = glyphIndexOffset + index * GLYPH_RECORD_SIZE;
        const codePoint = view.getUint32(recordOffset + 0x00, true);
        const dataOffset = view.getUint32(recordOffset + 0x04, true);
        const glyphWidth = view.getUint16(recordOffset + 0x08, true);
        const glyphHeight = view.getUint16(recordOffset + 0x0A, true);
        checkRange(dataOffset, rowStride * glyphHeight, buffer.byteLength, fail, `glyph 0x${codePoint.toString(16)}`);
        glyphs[String(codePoint)] = readGlyphData(bytes, dataOffset, glyphWidth, glyphHeight, rowStride);
    }

    return {
        schema: 'bitmap-font/v1',
        binarySchema: 'bitmap-font-binary/v1',
        id,
        label,
        encoding: encodingName,
        range: [first, last],
        width,
        height,
        advance,
        baseline,
        blank,
        fallback,
        glyphs
    };
}

export function inspectBitmapFontBinary(arrayBuffer) {
    const buffer = arrayBuffer instanceof ArrayBuffer
        ? arrayBuffer
        : arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    return {
        magic: readAscii(bytes, 0x00, 4),
        versionMajor: view.getUint16(0x04, true),
        versionMinor: view.getUint16(0x06, true),
        headerSize: view.getUint16(0x08, true),
        alignment: view.getUint16(0x0A, true),
        fileSize: view.getUint32(0x0C, true),
        flags: view.getUint32(0x10, true),
        encodingId: view.getUint32(0x14, true),
        firstCodePoint: view.getUint32(0x18, true),
        lastCodePoint: view.getUint32(0x1C, true),
        glyphCount: view.getUint32(0x20, true),
        fallbackCodePoint: view.getUint32(0x24, true),
        width: view.getUint16(0x28, true),
        height: view.getUint16(0x2A, true),
        advance: view.getUint16(0x2C, true),
        baseline: view.getUint16(0x2E, true),
        rowStride: view.getUint16(0x30, true),
        glyphRecordSize: view.getUint16(0x32, true),
        glyphIndexOffset: view.getUint32(0x34, true),
        glyphIndexSize: view.getUint32(0x38, true),
        glyphDataOffset: view.getUint32(0x3C, true),
        glyphDataSize: view.getUint32(0x40, true),
        stringTableOffset: view.getUint32(0x44, true),
        stringTableSize: view.getUint32(0x48, true),
        nameOffset: view.getUint32(0x4C, true),
        labelOffset: view.getUint32(0x50, true),
        encodingNameOffset: view.getUint32(0x54, true)
    };
}

function validateFont(font) {
    if (!font || !font.id) throw new Error('Font id is required');
    if (!Array.isArray(font.range) || font.range.length !== 2) throw new Error('Font range is required');
    if (!Number.isInteger(font.width) || font.width < 1 || font.width > 32) throw new Error('Binary exporter supports widths from 1 to 32');
    if (!Number.isInteger(font.height) || font.height < 1 || font.height > 255) throw new Error('Binary exporter supports heights from 1 to 255');
}

function writeGlyphData(bytes, offset, glyph, width, height, rowStride) {
    for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
        const mask = rowToMask(glyph[rowIndex] || '0'.repeat(width));
        const rowOffset = offset + rowIndex * rowStride;
        for (let byteIndex = 0; byteIndex < rowStride; byteIndex += 1) {
            bytes[rowOffset + byteIndex] = (mask >> (byteIndex * 8)) & 0xFF;
        }
    }
}

function readGlyphData(bytes, offset, width, height, rowStride) {
    const rows = [];
    for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
        let mask = 0;
        const rowOffset = offset + rowIndex * rowStride;
        for (let byteIndex = 0; byteIndex < rowStride; byteIndex += 1) {
            mask |= bytes[rowOffset + byteIndex] << (byteIndex * 8);
        }
        rows.push(maskToRow(mask, width));
    }
    return rows;
}

function rowToMask(row) {
    let value = 0;
    for (let index = 0; index < row.length; index += 1) {
        value = (value << 1) | (row[index] === '1' ? 1 : 0);
    }
    return value >>> 0;
}

function maskToRow(mask, width) {
    let row = '';
    for (let index = width - 1; index >= 0; index -= 1) {
        row += ((mask >> index) & 1) ? '1' : '0';
    }
    return row;
}

function buildStringTable(values) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [];
    let cursor = 0;
    for (const value of values) {
        offsets.push(cursor);
        const encoded = encoder.encode(String(value || ''));
        chunks.push(encoded, Uint8Array.of(0));
        cursor += encoded.length + 1;
    }
    const buffer = new Uint8Array(cursor);
    let offset = 0;
    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
    }
    return { buffer, offsets };
}

function readCString(bytes, tableOffset, tableSize, relativeOffset) {
    if (relativeOffset >= tableSize) return '';
    const start = tableOffset + relativeOffset;
    const endLimit = tableOffset + tableSize;
    let end = start;
    while (end < endLimit && bytes[end] !== 0) end += 1;
    return new TextDecoder('utf-8').decode(bytes.slice(start, end));
}

function checkRange(offset, size, limit, fail, label) {
    if (offset % ALIGNMENT !== 0 && label !== 'glyph 0x0') {
        // Glyph data records are not individually aligned; section offsets are aligned.
    }
    if (offset < 0 || size < 0 || offset + size > limit) {
        fail(`${label} is outside file bounds`);
    }
}

function align(value, alignment) {
    return Math.ceil(value / alignment) * alignment;
}

function encodingToId(value) {
    return ENCODING_IDS[String(value || 'unknown').toLowerCase()] || 0;
}

function writeAscii(bytes, offset, value) {
    for (let index = 0; index < value.length; index += 1) {
        bytes[offset + index] = value.charCodeAt(index) & 0x7F;
    }
}

function readAscii(bytes, offset, length) {
    let output = '';
    for (let index = 0; index < length; index += 1) {
        output += String.fromCharCode(bytes[offset + index]);
    }
    return output;
}

function writeU16(view, offset, value) {
    view.setUint16(offset, value, true);
}

function writeU32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
}
