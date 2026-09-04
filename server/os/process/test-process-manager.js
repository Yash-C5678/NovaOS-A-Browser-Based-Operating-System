import { ProcessManager } from "./ProcessManager.js";
import { PROCESS_STATES } from "../core/constants/processStates.js";

const processManager = new ProcessManager();

const browserProcess = processManager.createProcess({
    applicationId: "browser",
    priority: 10
});

const terminalProcess = processManager.createProcess({
    applicationId: "terminal",
    priority: 5
});

processManager.startProcess(browserProcess.pid);
processManager.runProcess(browserProcess.pid);

processManager.startProcess(terminalProcess.pid);

console.log("\n=== PROCESS TABLE ===");
console.log(processManager.getAllProcesses());

console.log("\n=== RUNNING PROCESSES ===");
console.log(
    processManager.getProcessesByState(PROCESS_STATES.RUNNING)
);

console.log("\n=== READY PROCESSES ===");
console.log(
    processManager.getProcessesByState(PROCESS_STATES.READY)
);

console.log("\n=== PROCESS COUNTS ===");
console.log(processManager.getStateCounts());

console.log("\n=== TOTAL PROCESSES ===");
console.log(processManager.getProcessCount());