import { ProcessManager } from "../process/ProcessManager.js";
import { Dispatcher } from "./core/Dispatcher.js";
import { SimulatedCPU } from "./core/SimulatedCPU.js";

const processManager = new ProcessManager();

const processA = processManager.createProcess({
    applicationId: "browser",
    arrivalTime: 0,
    burstTime: 5
});

const processB = processManager.createProcess({
    applicationId: "terminal",
    arrivalTime: 1,
    burstTime: 3
});

processManager.startProcess(processA.pid);
processManager.startProcess(processB.pid);

const dispatcher = new Dispatcher(processManager);
const cpu = new SimulatedCPU(processManager);

console.log("\n=== INITIAL STATES ===");

console.log({
    pid: processA.pid,
    state: processA.state,
    remaining: processA.remainingBurstTime
});

console.log({
    pid: processB.pid,
    state: processB.state,
    remaining: processB.remainingBurstTime
});

console.log("\n=== DISPATCH A ===");

dispatcher.dispatch(processA.pid);

cpu.executeUnit(processA.pid);
cpu.executeUnit(processA.pid);

console.log({
    time: cpu.getTime(),
    currentProcess: dispatcher.getCurrentProcess()?.pid,
    processAState: processA.state,
    processARemaining: processA.remainingBurstTime
});

console.log("\n=== PREEMPT A / DISPATCH B ===");

dispatcher.dispatch(processB.pid);

console.log({
    currentProcess: dispatcher.getCurrentProcess()?.pid,
    processAState: processA.state,
    processBState: processB.state,
    contextSwitches: dispatcher.getContextSwitchCount()
});

console.log("\n=== RESUME A ===");

dispatcher.dispatch(processA.pid);

console.log({
    currentProcess: dispatcher.getCurrentProcess()?.pid,
    processAState: processA.state,
    processBState: processB.state,
    contextSwitches: dispatcher.getContextSwitchCount()
});

console.log("\n=== FINAL PROCESS TABLE ===");

console.log(processManager.getAllProcesses());