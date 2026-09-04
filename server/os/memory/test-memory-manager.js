import { MemoryManager } from "./MemoryManager.js";

console.log("\n========================================");
console.log("NOVAOS MEMORY MANAGER TEST");
console.log("========================================\n");


function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}


/*
 * TEST 1
 * Initial memory state.
 */
function testInitialization() {
    const memory = new MemoryManager({
        totalMemory: 1024,
        algorithm: "first-fit"
    });

    const blocks = memory.getBlocks();

    assert(
        blocks.length === 1,
        "Memory should initially contain one free block."
    );

    assert(
        blocks[0].start === 0,
        "Initial memory must start at address 0."
    );

    assert(
        blocks[0].size === 1024,
        "Initial free block must contain all memory."
    );

    assert(
        blocks[0].isFree,
        "Initial memory block must be free."
    );

    console.log("✓ Memory initialization PASSED");
}


/*
 * TEST 2
 * First Fit allocation and block splitting.
 */
function testFirstFitAllocation() {
    const memory = new MemoryManager({
        totalMemory: 1024,
        algorithm: "first-fit"
    });

    const block = memory.allocate(
        "nova-1000",
        256
    );

    assert(
        block.start === 0,
        "First allocation should start at address 0."
    );

    assert(
        block.size === 256,
        "Allocated block size should be 256."
    );

    assert(
        block.pid === "nova-1000",
        "Allocated block must belong to nova-1000."
    );

    const freeBlock =
        memory.getFreeBlocks()[0];

    assert(
        freeBlock.start === 256,
        "Remaining free memory should start at address 256."
    );

    assert(
        freeBlock.size === 768,
        "Remaining free memory should be 768."
    );

    console.log(
        "✓ First Fit allocation PASSED"
    );
}


/*
 * TEST 3
 * Deallocation and merging.
 */
function testDeallocationAndMerge() {
    const memory = new MemoryManager({
        totalMemory: 1024,
        algorithm: "first-fit"
    });

    memory.allocate(
        "nova-1000",
        256
    );

    memory.allocate(
        "nova-1001",
        256
    );

    memory.deallocate(
        "nova-1000"
    );

    let blocks =
        memory.getBlocks();

    assert(
        blocks.length === 3,
        "Deallocation should create a free block without removing neighboring blocks."
    );

    assert(
        blocks[0].isFree,
        "First block should be free after deallocation."
    );

    memory.deallocate(
        "nova-1001"
    );

    blocks =
        memory.getBlocks();

    assert(
        blocks.length === 1,
        "Adjacent free blocks must be merged."
    );

    assert(
        blocks[0].isFree,
        "Merged memory must be free."
    );

    assert(
        blocks[0].size === 1024,
        "Merged free block must restore all memory."
    );

    console.log(
        "✓ Deallocation and merging PASSED"
    );
}


/*
 * TEST 4
 * Best Fit selection.
 */
function testBestFit() {
    const memory = new MemoryManager({
        totalMemory: 1000,
        algorithm: "best-fit"
    });

    memory.allocate(
        "nova-1000",
        200
    );

    memory.allocate(
        "nova-1001",
        300
    );

    memory.allocate(
        "nova-1002",
        100
    );

    memory.deallocate(
        "nova-1001"
    );

    memory.deallocate(
        "nova-1002"
    );

    /*
     * At this point the memory layout is:
     *
     * 0 - 199       allocated
     * 200 - 599     free (400)
     * 600 - 999     free (400)
     *
     * Both blocks are equal, so allocation should
     * use the first suitable block.
     */
    const block =
        memory.allocate(
            "nova-1003",
            150
        );

    assert(
        block.start === 200,
        "Best Fit should select the first smallest suitable block."
    );

    console.log(
        "✓ Best Fit allocation PASSED"
    );
}


/*
 * TEST 5
 * Worst Fit selection.
 */
function testWorstFit() {
    const memory = new MemoryManager({
        totalMemory: 1000,
        algorithm: "worst-fit"
    });

    memory.allocate(
        "nova-1000",
        200
    );

    memory.allocate(
        "nova-1001",
        300
    );

    memory.allocate(
        "nova-1002",
        100
    );

    memory.deallocate(
        "nova-1001"
    );

    /*
     * Layout:
     *
     * 0 - 199       allocated
     * 200 - 499     free (300)
     * 500 - 599     allocated
     * 600 - 999     free (400)
     *
     * Worst Fit must choose the 400-byte block.
     */
    const block =
        memory.allocate(
            "nova-1003",
            150
        );

    assert(
        block.start === 600,
        "Worst Fit should select the largest suitable block."
    );

    console.log(
        "✓ Worst Fit allocation PASSED"
    );
}


/*
 * TEST 6
 * Memory statistics.
 */
function testStatistics() {
    const memory = new MemoryManager({
        totalMemory: 1000,
        algorithm: "first-fit"
    });

    memory.allocate(
        "nova-1000",
        250
    );

    const statistics =
        memory.getStatistics();

    assert(
        statistics.totalMemory === 1000,
        "Total memory statistic is incorrect."
    );

    assert(
        statistics.allocatedMemory === 250,
        "Allocated memory statistic is incorrect."
    );

    assert(
        statistics.freeMemory === 750,
        "Free memory statistic is incorrect."
    );

    assert(
        statistics.utilization === 0.25,
        "Memory utilization is incorrect."
    );

    assert(
        statistics.largestFreeBlock === 750,
        "Largest free block statistic is incorrect."
    );

    console.log(
        "✓ Memory statistics PASSED"
    );
}


/*
 * TEST 7
 * Prevent duplicate allocation.
 */
function testDuplicateAllocation() {
    const memory = new MemoryManager({
        totalMemory: 512
    });

    memory.allocate(
        "nova-1000",
        128
    );

    let failed = false;

    try {
        memory.allocate(
            "nova-1000",
            64
        );
    } catch {
        failed = true;
    }

    assert(
        failed,
        "Duplicate PID allocation should be rejected."
    );

    console.log(
        "✓ Duplicate allocation protection PASSED"
    );
}


/*
 * TEST 8
 * Reject allocation larger than available
 * contiguous memory.
 */
function testInsufficientMemory() {
    const memory = new MemoryManager({
        totalMemory: 256
    });

    let failed = false;

    try {
        memory.allocate(
            "nova-1000",
            512
        );
    } catch {
        failed = true;
    }

    assert(
        failed,
        "Allocation larger than total memory must fail."
    );

    console.log(
        "✓ Insufficient memory protection PASSED"
    );
}


/*
 * TEST 9
 * Reset.
 */
function testReset() {
    const memory = new MemoryManager({
        totalMemory: 512
    });

    memory.allocate(
        "nova-1000",
        128
    );

    memory.allocate(
        "nova-1001",
        128
    );

    memory.reset();

    const blocks =
        memory.getBlocks();

    assert(
        blocks.length === 1,
        "Reset should restore a single memory block."
    );

    assert(
        blocks[0].isFree,
        "Memory should be completely free after reset."
    );

    assert(
        blocks[0].size === 512,
        "Reset should restore the complete memory size."
    );

    console.log(
        "✓ Memory reset PASSED"
    );
}


/*
 * Run all tests.
 */
testInitialization();
testFirstFitAllocation();
testDeallocationAndMerge();
testBestFit();
testWorstFit();
testStatistics();
testDuplicateAllocation();
testInsufficientMemory();
testReset();


console.log("\n========================================");
console.log("ALL MEMORY MANAGER TESTS PASSED");
console.log("========================================\n");