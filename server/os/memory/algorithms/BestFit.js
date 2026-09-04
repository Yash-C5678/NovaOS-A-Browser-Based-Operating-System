export class BestFit {
    constructor() {
        this.name = "Best Fit";
    }

    findBlock(blocks, size) {
        if (!Array.isArray(blocks)) {
            throw new Error(
                "Memory blocks must be provided as an array."
            );
        }

        if (!Number.isInteger(size) || size <= 0) {
            throw new Error(
                "Allocation size must be a positive integer."
            );
        }

        let bestBlock = null;

        for (const block of blocks) {
            if (
                block.isFree &&
                block.size >= size
            ) {
                if (
                    bestBlock === null ||
                    block.size < bestBlock.size
                ) {
                    bestBlock = block;
                }
            }
        }

        return bestBlock;
    }
}