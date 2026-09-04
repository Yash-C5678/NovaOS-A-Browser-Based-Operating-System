export class FirstFit {
    constructor() {
        this.name = "First Fit";
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

        return (
            blocks.find(
                (block) =>
                    block.isFree &&
                    block.size >= size
            ) ?? null
        );
    }
}