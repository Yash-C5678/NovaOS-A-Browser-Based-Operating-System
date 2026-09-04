import { ProcessManager } from "../process/ProcessManager.js";
import { SimulatedCPU } from "./core/SimulatedCPU.js";

const processManager = new ProcessManager();

const process = processManager.createProcess({
    applicationId: "browser",
    priority: 10,
    arrivalTime: 0,
    burstTime: 3
});

processManager.startProcess(process.pid);
processManager.runProcess(process.pid);

const cpu = new SimulatedCPU(processManager);

console.log("\n=== INITIAL PROCESS ===");
console.log(process);

console.log("\n=== CPU EXECUTION ===");

while (process.remainingBurstTime > 0) {
    cpu.executeUnit(process.pid);

    console.log({
        time: cpu.getTime(),
        pid: process.pid,
        remainingBurstTime: process.remainingBurstTime,
        state: process.state
    });
}

console.log("\n=== FINAL PROCESS ===");
console.log(process);

console.log("\n=== CPU STATISTICS ===");
console.log(cpu.getStatistics());