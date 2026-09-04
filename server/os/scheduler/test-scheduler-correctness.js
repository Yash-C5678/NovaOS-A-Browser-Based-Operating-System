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
    const processManager = new ProcessManager();

    processManager.createProcess({
        applicationId: "P1",
        arrivalTime: 0,
        burstTime: 8,
        priority: 2
    });

    processManager.createProcess({
        applicationId: "P2",
        arrivalTime: 1,
        burstTime: 4,
        priority: 4
    });

    processManager.createProcess({
        applicationId: "P3",
        arrivalTime: 2,
        burstTime: 2,
        priority: 1
    });

    processManager.createProcess({
        applicationId: "P4",
        arrivalTime: 3,
        burstTime: 1,
        priority: 5
    });

    const scheduler = new Scheduler(processManager);
    scheduler.setAlgorithm(algorithm);

    const dispatcher = new Dispatcher(processManager);

    const cpu = new SimulatedCPU(processManager);

    return new SimulationEngine({
        processManager,
        scheduler,
        dispatcher,
        cpu
    });
}


function normalizeTimeline(timeline) {
    return timeline.map(
        ({ pid, startTime, endTime }) => ({
            pid,
            startTime,
            endTime
        })
    );
}


function assertTimeline(actual, expected, algorithm) {
    const actualJSON = JSON.stringify(actual);
    const expectedJSON = JSON.stringify(expected);

    if (actualJSON !== expectedJSON) {
        console.error("\nEXPECTED:");
        console.table(expected);

        console.error("\nACTUAL:");
        console.table(actual);

        throw new Error(
            `${algorithm} timeline is incorrect.`
        );
    }
}


function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            `${message}\nExpected: ${expected}\nActual: ${actual}`
        );
    }
}


/*
 * Expected FCFS
 *
 * P1 runs completely first.
 */
function testFCFS() {
    const engine = createSimulation(new FCFS());
    const result = engine.run();

    const expected = [
        { pid: "nova-1000", startTime: 0, endTime: 8 },
        { pid: "nova-1001", startTime: 8, endTime: 12 },
        { pid: "nova-1002", startTime: 12, endTime: 14 },
        { pid: "nova-1003", startTime: 14, endTime: 15 }
    ];

    assertTimeline(
        normalizeTimeline(result.timeline),
        expected,
        "FCFS"
    );

    assertEqual(
        result.statistics.contextSwitches,
        0,
        "FCFS should not preempt."
    );

    console.log("✓ FCFS correctness PASSED");
}


/*
 * Expected SJF
 *
 * P1 arrives first and runs completely.
 * Afterwards shortest burst among waiting processes:
 *
 * P4 = 1
 * P3 = 2
 * P2 = 4
 */
function testSJF() {
    const engine = createSimulation(new SJF());
    const result = engine.run();

    const expected = [
        { pid: "nova-1000", startTime: 0, endTime: 8 },
        { pid: "nova-1003", startTime: 8, endTime: 9 },
        { pid: "nova-1002", startTime: 9, endTime: 11 },
        { pid: "nova-1001", startTime: 11, endTime: 15 }
    ];

    assertTimeline(
        normalizeTimeline(result.timeline),
        expected,
        "SJF"
    );

    assertEqual(
        result.statistics.contextSwitches,
        0,
        "SJF should not preempt."
    );

    console.log("✓ SJF correctness PASSED");
}


/*
 * Expected SRTF
 *
 * t=0: P1 starts.
 * t=1: P2 arrives, remaining P1=7, P2=4 → P2.
 * t=2: P3 arrives, P3=2 → P3.
 * t=3: P4 arrives, P3 remains 1 → P3 completes.
 * t=4: P4=1 → P4.
 * t=5: P2 has 3 remaining → P2.
 * t=8: P2 completes → P1.
 */
function testSRTF() {
    const engine = createSimulation(new SRTF());
    const result = engine.run();

    const expected = [
        { pid: "nova-1000", startTime: 0, endTime: 1 },
        { pid: "nova-1001", startTime: 1, endTime: 2 },
        { pid: "nova-1002", startTime: 2, endTime: 4 },
        { pid: "nova-1003", startTime: 4, endTime: 5 },
        { pid: "nova-1001", startTime: 5, endTime: 8 },
        { pid: "nova-1000", startTime: 8, endTime: 15 }
    ];

    assertTimeline(
        normalizeTimeline(result.timeline),
        expected,
        "SRTF"
    );

    console.log("✓ SRTF timeline correctness PASSED");

    /*
     * At least one preemption must have occurred.
     */
    if (result.statistics.contextSwitches <= 0) {
        throw new Error(
            "SRTF should produce context switches/preemptions."
        );
    }

    console.log("✓ SRTF preemption correctness PASSED");
}


/*
 * Expected non-preemptive Priority
 *
 * Lower numeric value = higher priority.
 *
 * P1 starts at t=0 and completes.
 * Then:
 * P3 priority 1
 * P2 priority 4
 * P4 priority 5
 */
function testPriority() {
    const engine = createSimulation(new Priority());
    const result = engine.run();

    const expected = [
        { pid: "nova-1000", startTime: 0, endTime: 8 },
        { pid: "nova-1002", startTime: 8, endTime: 10 },
        { pid: "nova-1001", startTime: 10, endTime: 14 },
        { pid: "nova-1003", startTime: 14, endTime: 15 }
    ];

    assertTimeline(
        normalizeTimeline(result.timeline),
        expected,
        "Priority"
    );

    assertEqual(
        result.statistics.contextSwitches,
        0,
        "Non-preemptive Priority should not preempt."
    );

    console.log("✓ Priority correctness PASSED");
}


/*
 * Expected Preemptive Priority
 *
 * Lower numeric priority = higher priority.
 *
 * P1 starts.
 *
 * t=1:
 * P2 arrives with priority 4.
 * P1 priority 2 remains superior → P1 continues.
 *
 * t=2:
 * P3 arrives with priority 1 → preempts P1.
 *
 * P3 completes at t=4.
 *
 * P1 resumes.
 *
 * P4 arrives at t=3 with priority 5,
 * so it does not preempt P3.
 */
function testPreemptivePriority() {
    const engine =
        createSimulation(
            new PreemptivePriority()
        );

    const result = engine.run();

    const expected = [
        { pid: "nova-1000", startTime: 0, endTime: 2 },
        { pid: "nova-1002", startTime: 2, endTime: 4 },
        { pid: "nova-1000", startTime: 4, endTime: 10 },
        { pid: "nova-1001", startTime: 10, endTime: 14 },
        { pid: "nova-1003", startTime: 14, endTime: 15 }
    ];

    assertTimeline(
        normalizeTimeline(result.timeline),
        expected,
        "Preemptive Priority"
    );

    if (result.statistics.contextSwitches <= 0) {
        throw new Error(
            "Preemptive Priority should produce context switches."
        );
    }

    console.log(
        "✓ Preemptive Priority correctness PASSED"
    );
}


/*
 * Expected Round Robin with quantum = 2.
 *
 * This is the important test.
 *
 * Processes:
 *
 * P1 = 8
 * P2 = 4
 * P3 = 2
 * P4 = 1
 *
 * Expected scheduling:
 *
 * P1 0-2
 * P2 2-4
 * P3 4-6
 * P4 6-7
 * P1 7-9
 * P2 9-11
 * P1 11-13
 * P1 13-15
 *
 * Therefore RR MUST NOT look like FCFS.
 */
function testRoundRobin() {
    const engine =
        createSimulation(
            new RoundRobin(2)
        );

    const result = engine.run();

    const expected = [
        { pid: "nova-1000", startTime: 0, endTime: 2 },
        { pid: "nova-1001", startTime: 2, endTime: 4 },
        { pid: "nova-1002", startTime: 4, endTime: 6 },
        { pid: "nova-1003", startTime: 6, endTime: 7 },
        { pid: "nova-1000", startTime: 7, endTime: 9 },
        { pid: "nova-1001", startTime: 9, endTime: 11 },
        { pid: "nova-1000", startTime: 11, endTime: 15 }
    ];

    assertTimeline(
        normalizeTimeline(result.timeline),
        expected,
        "Round Robin"
    );

    if (result.statistics.contextSwitches <= 0) {
        throw new Error(
            "Round Robin should produce context switches."
        );
    }

    console.log(
        "✓ Round Robin correctness PASSED"
    );
}


console.log("\n========================================");
console.log("NOVAOS SCHEDULER CORRECTNESS TEST");
console.log("========================================\n");

testFCFS();
testSJF();
testSRTF();
testPriority();
testPreemptivePriority();
testRoundRobin();

console.log("\n========================================");
console.log("ALL SCHEDULER CORRECTNESS TESTS PASSED");
console.log("========================================");