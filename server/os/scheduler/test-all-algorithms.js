import { ProcessManager } from "../process/ProcessManager.js";
import { Scheduler } from "./core/Scheduler.js";
import { Dispatcher } from "./core/Dispatcher.js";
import { SimulatedCPU } from "./core/SimulatedCPU.js";
import { SimulationEngine } from "./core/SimulationEngine.js";

import { FCFS } from "./algorithms/FCFS.js";
import { SJF } from "./algorithms/SJF.js";
import { SRTF } from "./algorithms/SRTF.js";
import { Priority } from "./algorithms/Priority.js";
import { PreemptivePriority } from "./algorithms/PreemptivePriority.js";
import { RoundRobin } from "./algorithms/RoundRobin.js";

function createSimulation(algorithm) {
    const processManager =
        new ProcessManager();

    processManager.createProcess({
        applicationId: "browser",
        arrivalTime: 0,
        burstTime: 8,
        priority: 2
    });

    processManager.createProcess({
        applicationId: "terminal",
        arrivalTime: 1,
        burstTime: 4,
        priority: 4
    });

    processManager.createProcess({
        applicationId: "settings",
        arrivalTime: 2,
        burstTime: 2,
        priority: 1
    });

    processManager.createProcess({
        applicationId: "files",
        arrivalTime: 3,
        burstTime: 1,
        priority: 5
    });

    const scheduler =
        new Scheduler(processManager);

    scheduler.setAlgorithm(algorithm);

    const dispatcher =
        new Dispatcher(processManager);

    const cpu =
        new SimulatedCPU(processManager);

    const engine =
        new SimulationEngine({
            processManager,
            scheduler,
            dispatcher,
            cpu
        });

    return engine;
}

const algorithms = [
    new FCFS(),
    new SJF(),
    new SRTF(),
    new Priority(),
    new PreemptivePriority(),
    new RoundRobin(2)
];

for (const algorithm of algorithms) {
    console.log(
        "\n========================================"
    );

    console.log(
        `ALGORITHM: ${algorithm.name}`
    );

    console.log(
        "========================================"
    );

    const engine =
        createSimulation(algorithm);

    const result = engine.run();

    console.log(
        "\nTimeline:"
    );

    console.table(
        result.timeline
    );

    console.log(
        "\nStatistics:"
    );

    console.table(
        result.statistics
    );

    console.log(
        "\nAverage Metrics:"
    );

    console.table(
        result.averages
    );

    console.log(
        "\nProcesses:"
    );

    console.table(
        result.processes
    );

    const allTerminated =
        result.processes.every(
            (process) =>
                process.state ===
                "terminated"
        );

    if (!allTerminated) {
        throw new Error(
            `${algorithm.name} failed: not all processes terminated.`
        );
    }

    if (!result.completed) {
        throw new Error(
            `${algorithm.name} failed: simulation did not complete.`
        );
    }

    console.log(
        `✓ ${algorithm.name} PASSED`
    );
}

console.log(
    "\n========================================"
);

console.log(
    "ALL CPU SCHEDULING ALGORITHMS PASSED"
);

console.log(
    "========================================"
);