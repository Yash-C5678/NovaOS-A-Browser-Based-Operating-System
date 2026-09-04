import { ProcessManager } from "../process/ProcessManager.js";
import { Scheduler } from "./core/Scheduler.js";
import { Dispatcher } from "./core/Dispatcher.js";
import { SimulatedCPU } from "./core/SimulatedCPU.js";
import { SimulationEngine } from "./core/SimulationEngine.js";
import { FCFS } from "./algorithms/FCFS.js";

const processManager = new ProcessManager();

processManager.createProcess({
    applicationId: "browser",
    arrivalTime: 0,
    burstTime: 3
});

processManager.createProcess({
    applicationId: "terminal",
    arrivalTime: 1,
    burstTime: 2
});

processManager.createProcess({
    applicationId: "settings",
    arrivalTime: 2,
    burstTime: 1
});

const scheduler = new Scheduler(processManager);

scheduler.setAlgorithm(new FCFS());

const dispatcher = new Dispatcher(processManager);

const cpu = new SimulatedCPU(processManager);

const engine = new SimulationEngine({
    processManager,
    scheduler,
    dispatcher,
    cpu
});

console.log("\n=== SIMULATION START ===");

while (!engine.isComplete()) {
    const result = engine.step();

    console.log(result);
}

console.log("\n=== TIMELINE ===");

console.log(engine.getTimeline());

console.log("\n=== CPU STATISTICS ===");

console.log(engine.getStatistics());

console.log("\n=== FINAL PROCESSES ===");

console.log(processManager.getAllProcesses());