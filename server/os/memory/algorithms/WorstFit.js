export class WorstFit {
    constructor() {
        this.name = "Worst Fit";
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

        let worstBlock = null;

        for (const block of blocks) {
            if (
                block.isFree &&
                block.size >= size
            ) {
                if (
                    worstBlock === null ||
                    block.size > worstBlock.size
                ) {
                    worstBlock = block;
                }
            }
        }

        return worstBlock;
    }
}