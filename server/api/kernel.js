import { Kernel } from "../os/kernel/Kernel.js";

export const kernel = new Kernel({
    totalMemory: 1024,
    memoryAlgorithm: "first-fit"
});