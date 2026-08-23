#pragma once

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define GGML_MAX_DIMS          4
#define GGML_MAX_NODES         8192
#define GGML_MAX_PARAMS        2048
#define GGML_MAX_CONTEXTS      64
#define GGML_MAX_SRC           10

#define GGML_DEFAULT_N_THREADS 4

typedef int32_t ggml_status;
#define GGML_STATUS_ALLOC_FAILED -2
#define GGML_STATUS_FAILED       -1
#define GGML_STATUS_SUCCESS       0
#define GGML_STATUS_ABORTED       1

struct ggml_init_params {
    size_t mem_size;   // bytes
    void * mem_buffer; // if NULL, memory will be allocated internally
    bool   no_alloc;   // don't allocate memory to tensors
};

struct ggml_context {
    size_t mem_size;
    void * mem_buffer;
    bool   no_alloc;
    int    n_objects;
    struct ggml_object * objects_begin;
    struct ggml_object * objects_end;
};

struct ggml_tensor {
    ggml_type type;
    int32_t n_dims;
    int64_t ne[GGML_MAX_DIMS]; // number of elements
    size_t  nb[GGML_MAX_DIMS]; // stride in bytes
    uint32_t flags;
    struct ggml_tensor * src[GGML_MAX_SRC];
    void * data;
    char name[64];
    void * extra;
};

struct ggml_context * ggml_init(struct ggml_init_params params);
void ggml_free(struct ggml_context * ctx);

size_t ggml_used_mem(const struct ggml_context * ctx);
size_t ggml_nbytes(const struct ggml_tensor * tensor);
size_t ggml_type_size(ggml_type type);

void ggml_time_init(void);
int64_t ggml_time_ms(void);
int64_t ggml_time_us(void);

#ifdef __cplusplus
}
#endif
