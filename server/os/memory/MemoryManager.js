import { MemoryBlock } from "./MemoryBlock.js";
import { FirstFit } from "./algorithms/FirstFit.js";
import { BestFit } from "./algorithms/BestFit.js";
import { WorstFit } from "./algorithms/WorstFit.js";

export class MemoryManager {
    constructor({
        totalMemory = 1024,
        algorithm = "first-fit"
    } = {}) {
        if (
            !Number.isInteger(totalMemory) ||
            totalMemory <= 0
        ) {
            throw new Error(
                "Total memory must be a positive integer."
            );
        }

        this.totalMemory = totalMemory;

        this.blocks = [
            new MemoryBlock({
                start: 0,
                size: totalMemory
            })
        ];

        this.algorithms = {
            "first-fit": new FirstFit(),
            "best-fit": new BestFit(),
            "worst-fit": new WorstFit()
        };

        this.setAlgorithm(algorithm);
    }

    setAlgorithm(algorithm) {
        if (
            typeof algorithm !== "string" ||
            !this.algorithms[algorithm]
        ) {
            throw new Error(
                `Unknown memory allocation algorithm '${algorithm}'.`
            );
        }

        this.algorithm = algorithm;
        this.allocator = this.algorithms[algorithm];
    }

    getAlgorithmName() {
        return this.allocator.name;
    }

    allocate(pid, size) {
        if (!pid) {
            throw new Error(
                "PID is required for memory allocation."
            );
        }

        if (
            !Number.isInteger(size) ||
            size <= 0
        ) {
            throw new Error(
                "Allocation size must be a positive integer."
            );
        }

        const existingBlock = this.blocks.find(
            (block) => block.pid === pid
        );

        if (existingBlock) {
            throw new Error(
                `Process '${pid}' already has allocated memory.`
            );
        }

        const selectedBlock =
            this.allocator.findBlock(
                this.blocks,
                size
            );

        if (!selectedBlock) {
            throw new Error(
                `Insufficient contiguous memory for process '${pid}'.`
            );
        }

        const index =
            this.blocks.indexOf(selectedBlock);

        /*
         * Exact-size allocation.
         */
        if (selectedBlock.size === size) {
            selectedBlock.allocate(pid);

            return selectedBlock.clone();
        }

        /*
         * Split the free block.
         *
         * Example:
         *
         * Free block: 0 - 999
         * Request:    300
         *
         * Result:
         * 0 - 299   -> allocated
         * 300 - 999 -> free
         */
        const allocatedBlock =
            new MemoryBlock({
                start: selectedBlock.start,
                size,
                pid
            });

        const remainingBlock =
            new MemoryBlock({
                start:
                    selectedBlock.start + size,
                size:
                    selectedBlock.size - size
            });

        this.blocks.splice(
            index,
            1,
            allocatedBlock,
            remainingBlock
        );

        return allocatedBlock.clone();
    }

    deallocate(pid) {
        if (!pid) {
            throw new Error(
                "PID is required for memory deallocation."
            );
        }

        const index = this.blocks.findIndex(
            (block) => block.pid === pid
        );

        if (index === -1) {
            throw new Error(
                `No memory allocation found for process '${pid}'.`
            );
        }

        this.blocks[index].free();

        this.mergeAdjacentFreeBlocks();

        return true;
    }

    mergeAdjacentFreeBlocks() {
        const mergedBlocks = [];

        for (const block of this.blocks) {
            const previous =
                mergedBlocks[
                mergedBlocks.length - 1
                ];

            if (
                previous &&
                previous.isFree &&
                block.isFree &&
                previous.end + 1 === block.start
            ) {
                previous.size += block.size;
            } else {
                mergedBlocks.push(block);
            }
        }

        this.blocks = mergedBlocks;
    }

    getBlocks() {
        return this.blocks.map(
            (block) => block.clone()
        );
    }

    getMemoryMap() {
        return this.blocks.map(
            (block) => block.toJSON()
        );
    }

    getAllocatedBlocks() {
        return this.blocks
            .filter(
                (block) => block.isAllocated
            )
            .map(
                (block) => block.clone()
            );
    }

    getFreeBlocks() {
        return this.blocks
            .filter(
                (block) => block.isFree
            )
            .map(
                (block) => block.clone()
            );
    }

    getAllocatedMemory() {
        return this.getAllocatedBlocks()
            .reduce(
                (total, block) =>
                    total + block.size,
                0
            );
    }

    getFreeMemory() {
        return this.totalMemory -
            this.getAllocatedMemory();
    }

    getLargestFreeBlock() {
        const freeBlocks =
            this.getFreeBlocks();

        if (freeBlocks.length === 0) {
            return 0;
        }

        return Math.max(
            ...freeBlocks.map(
                (block) => block.size
            )
        );
    }

    getExternalFragmentation() {
        const freeMemory =
            this.getFreeMemory();

        if (freeMemory === 0) {
            return 0;
        }

        const largestFreeBlock =
            this.getLargestFreeBlock();

        return (
            (freeMemory - largestFreeBlock) /
            freeMemory
        );
    }

    getStatistics() {
        const allocatedMemory =
            this.getAllocatedMemory();

        const freeMemory =
            this.getFreeMemory();

        return {
            totalMemory: this.totalMemory,

            allocatedMemory,

            freeMemory,

            utilization:
                allocatedMemory /
                this.totalMemory,

            numberOfBlocks:
                this.blocks.length,

            allocatedBlocks:
                this.getAllocatedBlocks()
                    .length,

            freeBlocks:
                this.getFreeBlocks()
                    .length,

            largestFreeBlock:
                this.getLargestFreeBlock(),

            externalFragmentation:
                this.getExternalFragmentation(),

            algorithm:
                this.getAlgorithmName()
        };
    }

    hasAllocation(pid) {
        return this.blocks.some(
            (block) => block.pid === pid
        );
    }

    getAllocation(pid) {
        const block = this.blocks.find(
            (block) => block.pid === pid
        );

        return block
            ? block.clone()
            : null;
    }

    reset() {
        this.blocks = [
            new MemoryBlock({
                start: 0,
                size: this.totalMemory
            })
        ];
    }
}