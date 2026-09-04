import { DeadlockManager } from "./core/DeadlockManager.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/*
 * --------------------------------------------------
 * BASIC RESOURCE / PROCESS REGISTRATION
 * --------------------------------------------------
 */

function createBasicSystem() {
    const manager =
        new DeadlockManager();

    manager.registerResource({
        id: "R1",
        total: 10
    });

    manager.registerResource({
        id: "R2",
        total: 5
    });

    return manager;
}

function testResourceRegistration() {
    const manager =
        createBasicSystem();

    assert(
        manager.getResources().length === 2,
        "Two resources should be registered."
    );

    assert(
        manager.getResource("R1").total === 10,
        "R1 total should be 10."
    );

    assert(
        manager.getResource("R2").total === 5,
        "R2 total should be 5."
    );

    console.log(
        "✓ Resource registration PASSED"
    );
}

/*
 * --------------------------------------------------
 * PROCESS REGISTRATION
 * --------------------------------------------------
 */

function testProcessRegistration() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.registerProcess({
        pid: "P2",
        maximum: [3, 2]
    });

    assert(
        manager.getProcesses().length === 2,
        "Two processes should be registered."
    );

    const process =
        manager.getProcess("P1");

    assert(
        process.maximum[0] === 7 &&
        process.maximum[1] === 5,
        "P1 maximum demand is incorrect."
    );

    assert(
        process.allocation[0] === 0 &&
        process.allocation[1] === 0,
        "New process allocation should be zero."
    );

    console.log(
        "✓ Process registration PASSED"
    );
}

/*
 * --------------------------------------------------
 * RESOURCE ALLOCATION
 * --------------------------------------------------
 */

function testResourceAllocation() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.allocateResources(
        "P1",
        [3, 2]
    );

    const process =
        manager.getProcess("P1");

    assert(
        process.allocation[0] === 3 &&
        process.allocation[1] === 2,
        "P1 allocation is incorrect."
    );

    const available =
        manager.getAvailableResources();

    assert(
        available[0] === 7 &&
        available[1] === 3,
        "Available resources are incorrect."
    );

    console.log(
        "✓ Resource allocation PASSED"
    );
}

/*
 * --------------------------------------------------
 * NEED MATRIX
 * --------------------------------------------------
 */

function testNeedMatrix() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.allocateResources(
        "P1",
        [3, 2]
    );

    const need =
        manager.getNeedMatrix();

    assert(
        need.P1[0] === 4 &&
        need.P1[1] === 3,
        "Need matrix calculation is incorrect."
    );

    console.log(
        "✓ Need matrix calculation PASSED"
    );
}

/*
 * --------------------------------------------------
 * BANKER'S ALGORITHM — SAFE STATE
 * --------------------------------------------------
 *
 * Classic-style safe-state scenario.
 */

function testSafeState() {
    const manager =
        new DeadlockManager();

    manager.registerResource({
        id: "R1",
        total: 10
    });

    manager.registerResource({
        id: "R2",
        total: 5
    });

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.registerProcess({
        pid: "P2",
        maximum: [3, 2]
    });

    manager.registerProcess({
        pid: "P3",
        maximum: [2, 2]
    });

    manager.allocateResources(
        "P1",
        [3, 2]
    );

    manager.allocateResources(
        "P2",
        [2, 0]
    );

    manager.allocateResources(
        "P3",
        [1, 1]
    );

    const result =
        manager.checkSafety();

    assert(
        result.safe === true,
        "System should be in a safe state."
    );

    assert(
        result.safeSequence.length === 3,
        "Safe sequence should contain all processes."
    );

    assert(
        result.unsafeProcesses.length === 0,
        "Safe state should have no unsafe processes."
    );

    console.log(
        "✓ Banker's safe-state detection PASSED"
    );
}

/*
 * --------------------------------------------------
 * BANKER'S ALGORITHM — UNSAFE STATE
 * --------------------------------------------------
 */

function testUnsafeState() {
    const manager =
        new DeadlockManager();

    manager.registerResource({
        id: "R1",
        total: 10
    });

    manager.registerResource({
        id: "R2",
        total: 5
    });

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.registerProcess({
        pid: "P2",
        maximum: [6, 4]
    });

    /*
     * Consume almost all available resources
     * while leaving both processes unable to
     * satisfy their remaining maximum need.
     */
    manager.allocateResources(
        "P1",
        [6, 4]
    );

    manager.allocateResources(
        "P2",
        [4, 1]
    );

    const result =
        manager.checkSafety();

    assert(
        result.safe === false,
        "System should be unsafe."
    );

    assert(
        result.unsafeProcesses.length > 0,
        "Unsafe processes should be reported."
    );

    console.log(
        "✓ Banker's unsafe-state detection PASSED"
    );
}

/*
 * --------------------------------------------------
 * RESOURCE REQUEST — SAFE
 * --------------------------------------------------
 */

function testSafeResourceRequest() {
    const manager =
        new DeadlockManager();

    manager.registerResource({
        id: "R1",
        total: 10
    });

    manager.registerResource({
        id: "R2",
        total: 5
    });

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.registerProcess({
        pid: "P2",
        maximum: [3, 2]
    });

    manager.allocateResources(
        "P1",
        [3, 2]
    );

    manager.allocateResources(
        "P2",
        [2, 0]
    );

    const result =
        manager.requestResources(
            "P2",
            [1, 1]
        );

    assert(
        result.granted === true,
        "Safe resource request should be granted."
    );

    const process =
        manager.getProcess("P2");

    assert(
        process.allocation[0] === 3 &&
        process.allocation[1] === 1,
        "Granted resources were not allocated correctly."
    );

    console.log(
        "✓ Safe resource request PASSED"
    );
}

/*
 * --------------------------------------------------
 * RESOURCE REQUEST — EXCEEDS NEED
 * --------------------------------------------------
 */

function testRequestExceedsNeed() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [4, 3]
    });

    manager.allocateResources(
        "P1",
        [2, 1]
    );

    const result =
        manager.requestResources(
            "P1",
            [3, 3]
        );

    assert(
        result.granted === false,
        "Request exceeding remaining need must be rejected."
    );

    assert(
        result.reason.includes(
            "remaining maximum need"
        ),
        "Incorrect rejection reason for excessive request."
    );

    console.log(
        "✓ Excessive resource request protection PASSED"
    );
}

/*
 * --------------------------------------------------
 * RESOURCE RELEASE
 * --------------------------------------------------
 */

function testResourceRelease() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.allocateResources(
        "P1",
        [3, 2]
    );

    manager.releaseResources(
        "P1",
        [1, 1]
    );

    const process =
        manager.getProcess("P1");

    assert(
        process.allocation[0] === 2 &&
        process.allocation[1] === 1,
        "Released resources were not removed correctly."
    );

    const available =
        manager.getAvailableResources();

    assert(
        available[0] === 8 &&
        available[1] === 4,
        "Available resources after release are incorrect."
    );

    console.log(
        "✓ Resource release PASSED"
    );
}

/*
 * --------------------------------------------------
 * DEADLOCK DETECTION
 * --------------------------------------------------
 */

function testDeadlockDetection() {
    const manager =
        new DeadlockManager();

    manager.registerResource({
        id: "R1",
        total: 2
    });

    manager.registerResource({
        id: "R2",
        total: 2
    });

    manager.registerProcess({
        pid: "P1",
        maximum: [2, 2]
    });

    manager.registerProcess({
        pid: "P2",
        maximum: [2, 2]
    });

    /*
     * P1 holds R1 and needs R2.
     * P2 holds R2 and needs R1.
     *
     * Available = [0, 0].
     *
     * Neither process can obtain its
     * remaining resource.
     */
    manager.allocateResources(
        "P1",
        [1, 0]
    );

    manager.allocateResources(
        "P2",
        [0, 1]
    );

    const result =
        manager.detectDeadlock();

    assert(
        result.deadlockDetected === true,
        "Deadlock should be detected."
    );

    assert(
        result.deadlockedProcesses.includes(
            "P1"
        ),
        "P1 should be reported as deadlocked."
    );

    assert(
        result.deadlockedProcesses.includes(
            "P2"
        ),
        "P2 should be reported as deadlocked."
    );

    console.log(
        "✓ Deadlock detection PASSED"
    );
}

/*
 * --------------------------------------------------
 * NO DEADLOCK
 * --------------------------------------------------
 */

function testNoDeadlock() {
    const manager =
        new DeadlockManager();

    manager.registerResource({
        id: "R1",
        total: 5
    });

    manager.registerResource({
        id: "R2",
        total: 3
    });

    manager.registerProcess({
        pid: "P1",
        maximum: [3, 2]
    });

    manager.registerProcess({
        pid: "P2",
        maximum: [2, 1]
    });

    manager.allocateResources(
        "P1",
        [1, 1]
    );

    manager.allocateResources(
        "P2",
        [1, 0]
    );

    const result =
        manager.detectDeadlock();

    assert(
        result.deadlockDetected === false,
        "No deadlock should be detected."
    );

    assert(
        result.deadlockedProcesses.length === 0,
        "No processes should be reported as deadlocked."
    );

    console.log(
        "✓ No-deadlock detection PASSED"
    );
}

/*
 * --------------------------------------------------
 * TABLE / STATISTICS
 * --------------------------------------------------
 */

function testStatisticsAndTable() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.allocateResources(
        "P1",
        [2, 1]
    );

    const statistics =
        manager.getStatistics();

    assert(
        statistics.resourceCount === 2,
        "Statistics resource count is incorrect."
    );

    assert(
        statistics.processCount === 1,
        "Statistics process count is incorrect."
    );

    assert(
        statistics.available[0] === 8 &&
        statistics.available[1] === 4,
        "Statistics available resources are incorrect."
    );

    const table =
        manager.getDeadlockTable();

    assert(
        table.processes.length === 1,
        "Deadlock table should contain one process."
    );

    assert(
        table.processes[0].pid === "P1",
        "Deadlock table process ID is incorrect."
    );

    assert(
        table.processes[0].need[0] === 5 &&
        table.processes[0].need[1] === 4,
        "Deadlock table need values are incorrect."
    );

    console.log(
        "✓ Deadlock statistics and table PASSED"
    );
}

/*
 * --------------------------------------------------
 * INVALID INPUT PROTECTION
 * --------------------------------------------------
 */

function testInvalidInputProtection() {
    const manager =
        new DeadlockManager();

    let failed = false;

    try {
        manager.registerResource({
            id: "R1",
            total: -1
        });
    } catch {
        failed = true;
    }

    assert(
        failed,
        "Negative resource total must be rejected."
    );

    manager.registerResource({
        id: "R1",
        total: 5
    });

    failed = false;

    try {
        manager.registerProcess({
            pid: "P1",
            maximum: [1, 2]
        });
    } catch {
        failed = true;
    }

    /*
     * There is only one registered resource,
     * so a two-element maximum vector is invalid.
     */
    assert(
        failed,
        "Invalid maximum dimensions must be rejected."
    );

    console.log(
        "✓ Invalid input protection PASSED"
    );
}

/*
 * --------------------------------------------------
 * RESET
 * --------------------------------------------------
 */

function testReset() {
    const manager =
        createBasicSystem();

    manager.registerProcess({
        pid: "P1",
        maximum: [7, 5]
    });

    manager.allocateResources(
        "P1",
        [2, 1]
    );

    manager.checkSafety();
    manager.detectDeadlock();

    manager.reset();

    assert(
        manager.getResources().length === 0,
        "Reset should remove all resources."
    );

    assert(
        manager.getProcesses().length === 0,
        "Reset should remove all processes."
    );

    assert(
        manager.getAvailableResources().length === 0,
        "Reset should clear available resources."
    );

    assert(
        manager.getStatistics().safe === null,
        "Reset should clear safety result."
    );

    assert(
        manager.getStatistics()
            .deadlockDetected === null,
        "Reset should clear deadlock result."
    );

    console.log(
        "✓ Deadlock manager reset PASSED"
    );
}

/*
 * --------------------------------------------------
 * RUN TESTS
 * --------------------------------------------------
 */

console.log(
    "========================================"
);

console.log(
    "NOVAOS DEADLOCK TEST"
);

console.log(
    "========================================"
);

testResourceRegistration();
testProcessRegistration();
testResourceAllocation();
testNeedMatrix();
testSafeState();
testUnsafeState();
testSafeResourceRequest();
testRequestExceedsNeed();
testResourceRelease();
testDeadlockDetection();
testNoDeadlock();
testStatisticsAndTable();
testInvalidInputProtection();
testReset();

console.log();

console.log(
    "========================================"
);

console.log(
    "ALL DEADLOCK TESTS PASSED"
);

console.log(
    "========================================"
);