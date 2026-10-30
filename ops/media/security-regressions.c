// Focused local regression checks for the FFmpeg security backports.
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <sys/resource.h>
#include "libavutil/encryption_info.h"
#include "libavutil/hdr_dynamic_metadata.h"

static void hdr(void) {
    AVDynamicHDRPlus input = {0}, decoded = {0};
    uint8_t first[128] = {0}, second[128], *a = first, *b = second;
    size_t as = sizeof(first), bs = sizeof(second);
    memset(second, 0xff, sizeof(second));
    input.num_windows = 1;
    input.targeted_system_display_maximum_luminance = (AVRational){0, 1};
    for (int i = 0; i < 3; i++) input.params[0].maxscl[i] = (AVRational){0, 1};
    input.params[0].average_maxrgb = (AVRational){0, 1};
    input.params[0].fraction_bright_pixels = (AVRational){0, 1};
    input.params[0].tone_mapping_flag = 0;
    input.params[0].color_saturation_mapping_flag = 1;
    input.params[0].color_saturation_weight = (AVRational){1, 8};
    assert(av_dynamic_hdr_plus_to_t35(&input, &a, &as) == 0);
    assert(av_dynamic_hdr_plus_to_t35(&input, &b, &bs) == 0);
    assert(as == bs && memcmp(a, b, as) == 0);
    assert(av_dynamic_hdr_plus_from_t35(&decoded, a, as) == 0);
    assert(decoded.params[0].color_saturation_mapping_flag == 1);
    assert(decoded.params[0].color_saturation_weight.num == 1);
    puts("PASS: HDR serialization initializes all bytes and round-trips saturation without tone mapping");
}

static void pssh(void) {
    AVEncryptionInitInfo *head = NULL;
    struct rlimit stack = {128 * 1024, 128 * 1024};
    assert(setrlimit(RLIMIT_STACK, &stack) == 0);
    for (int i = 0; i < 100000; i++) {
        AVEncryptionInitInfo *item = av_encryption_init_info_alloc(0, 0, 0, 0);
        assert(item);
        item->next = head;
        head = item;
    }
    av_encryption_init_info_free(head);
    puts("PASS: 100000 encryption records freed within a 128 KiB stack");
}

int main(int argc, char **argv) {
    assert(argc == 2);
    if (strcmp(argv[1], "hdr") == 0) hdr();
    else if (strcmp(argv[1], "pssh") == 0) pssh();
    else return 2;
    return 0;
}
