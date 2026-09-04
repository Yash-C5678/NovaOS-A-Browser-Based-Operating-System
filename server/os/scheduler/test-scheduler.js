import { ProcessManager } from "../process/ProcessManager.js";
import { Scheduler } from "./core/Scheduler.js";
import { Dispatcher } from "./core/Dispatcher.js";
import { FCFS } from "./algorithms/FCFS.js";

const processManager = new ProcessManager();

const firstProcess = processManager.createProcess({
    applicationId: "browser",
    priority: 10
});

const secondProcess = processManager.createProcess({
    applicationId: "terminal",
    priority: 5
});

processManager.startProcess(firstProcess.pid);
processManager.startProcess(secondProcess.pid);

const scheduler = new Scheduler(processManager);
const dispatcher = new Dispatcher(processManager);

scheduler.setAlgorithm(new FCFS());

console.log("\n=== SCHEDULER ===");
console.log("Algorithm:", scheduler.getAlgorithmName());

console.log("\n=== READY QUEUE ===");
console.log(scheduler.getReadyProcesses());

const selectedProcess = scheduler.selectNext();

console.log("\n=== SELECTED PROCESS ===");
console.log(selectedProcess);

const dispatchedProcess = dispatcher.dispatch(selectedProcess.pid);

console.log("\n=== DISPATCHED PROCESS ===");
console.log(dispatchedProcess);

console.log("\n=== CURRENT PROCESS ===");
console.log(dispatcher.getCurrentProcess());

console.log("\n=== CONTEXT SWITCHES ===");
console.log(dispatcher.getContextSwitchCount());

console.log("\n=== PROCESS TABLE ===");
console.log(processManager.getAllProcesses());