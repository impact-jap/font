#ifndef BITMAP_FONT_BINARY_H
#define BITMAP_FONT_BINARY_H

#include <stdint.h>

#define BMF_BINARY_MAGIC_0 'B'
#define BMF_BINARY_MAGIC_1 'M'
#define BMF_BINARY_MAGIC_2 'F'
#define BMF_BINARY_MAGIC_3 'B'
#define BMF_BINARY_VERSION_MAJOR 1u
#define BMF_BINARY_VERSION_MINOR 0u
#define BMF_BINARY_HEADER_SIZE 128u
#define BMF_BINARY_ALIGNMENT 16u
#define BMF_BINARY_GLYPH_RECORD_SIZE 16u
#define BMF_BINARY_FLAG_ROW_MASKS_LE 0x00000001u

typedef struct bmf_binary_header_s {
    uint8_t magic[4];
    uint16_t version_major;
    uint16_t version_minor;
    uint16_t header_size;
    uint16_t alignment;
    uint32_t file_size;
    uint32_t flags;
    uint32_t encoding_id;
    uint32_t first_code_point;
    uint32_t last_code_point;
    uint32_t glyph_count;
    uint32_t fallback_code_point;
    uint16_t width;
    uint16_t height;
    uint16_t advance;
    uint16_t baseline;
    uint16_t row_stride;
    uint16_t glyph_record_size;
    uint32_t glyph_index_offset;
    uint32_t glyph_index_size;
    uint32_t glyph_data_offset;
    uint32_t glyph_data_size;
    uint32_t string_table_offset;
    uint32_t string_table_size;
    uint32_t name_offset;
    uint32_t label_offset;
    uint32_t encoding_name_offset;
    uint32_t reserved_0;
    uint32_t reserved_1;
    uint8_t reserved_padding[32];
} bmf_binary_header_t;

typedef struct bmf_binary_glyph_record_s {
    uint32_t code_point;
    uint32_t data_offset;
    uint16_t width;
    uint16_t height;
    uint16_t advance;
    uint16_t flags;
} bmf_binary_glyph_record_t;

static inline uint8_t bmf_binary_has_magic(const bmf_binary_header_t *header)
{
    return header != 0
        && header->magic[0] == (uint8_t)BMF_BINARY_MAGIC_0
        && header->magic[1] == (uint8_t)BMF_BINARY_MAGIC_1
        && header->magic[2] == (uint8_t)BMF_BINARY_MAGIC_2
        && header->magic[3] == (uint8_t)BMF_BINARY_MAGIC_3;
}

static inline uint8_t bmf_binary_is_supported(const bmf_binary_header_t *header)
{
    return bmf_binary_has_magic(header)
        && header->version_major == BMF_BINARY_VERSION_MAJOR
        && header->version_minor == BMF_BINARY_VERSION_MINOR
        && header->header_size == BMF_BINARY_HEADER_SIZE
        && header->alignment == BMF_BINARY_ALIGNMENT
        && header->glyph_record_size == BMF_BINARY_GLYPH_RECORD_SIZE;
}

static inline uint8_t bmf_binary_row_pixel(uint32_t row_mask, uint16_t width, uint16_t x)
{
    if (x >= width || width == 0u || width > 32u) {
        return 0u;
    }
    return (uint8_t)((row_mask >> ((width - 1u) - x)) & 1u);
}

#endif
