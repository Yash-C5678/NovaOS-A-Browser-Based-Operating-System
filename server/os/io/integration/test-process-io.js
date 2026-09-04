import { ProcessManager } from "../../process/ProcessManager.js";
import { DeviceManager } from "../devices/DeviceManager.js";
import { IOController } from "../core/IOController.js";
import {
    IO_REQUEST_STATES,
    IO_OPERATIONS
} from "../IORequest.js";
import { ProcessIOManager } from "./ProcessIOManager.js";
import { PROCESS_STATES } from "../../core/constants/processStates.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createSystem() {
    const processManager =
        new ProcessManager();

    const deviceManager =
        new DeviceManager();

    deviceManager.registerDevice({
        id: "disk-0",
        name: "System Disk",
        type: "storage"
    });

    const ioController =
        new IOController({
            deviceManager
        });

    const processIO =
        new ProcessIOManager({
            processManager,
            ioController
        });

    const process =
        processManager.createProcess({
            applicationId: "test-app",
            arrivalTime: 0,
            burstTime: 10
        });

    processManager.startProcess(
        process.pid
    );

    processManager.runProcess(
        process.pid
    );

    return {
        processManager,
        deviceManager,
        ioController,
        processIO,
        process
    };
}

function testRunningToWaiting() {
    const system =
        createSystem();

    const request =
        system.processIO.requestIO({
            pid: system.process.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    assert(
        system.process.state ===
            PROCESS_STATES.WAITING,
        "Process should enter WAITING state during I/O."
    );

    assert(
        request.pid === system.process.pid,
        "I/O request should belong to the process."
    );

    assert(
        request.state ===
            IO_REQUEST_STATES.ACTIVE,
        "I/O request should be active."
    );

    console.log(
        "? RUNNING ? WAITING transition PASSED"
    );
}

function testIOCompletionWakesProcess() {
    const system =
        createSystem();

    const request =
        system.processIO.requestIO({
            pid: system.process.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    system.processIO.executeRequestUnit(
        request.id
    );

    assert(
        system.process.state ===
            PROCESS_STATES.WAITING,
        "Process should remain WAITING during I/O."
    );

    system.processIO.executeRequestUnit(
        request.id
    );

    assert(
        system.process.state ===
            PROCESS_STATES.WAITING,
        "Process should remain WAITING before I/O completion."
    );

    system.processIO.executeRequestUnit(
        request.id
    );

    assert(
        request.state ===
            IO_REQUEST_STATES.COMPLETED,
        "I/O request should be completed."
    );

    assert(
        system.process.state ===
            PROCESS_STATES.READY,
        "Process should return to READY after I/O completion."
    );

    console.log(
        "? I/O completion ? READY transition PASSED"
    );
}

function testRequestProcessMapping() {
    const system =
        createSystem();

    const request =
        system.processIO.requestIO({
            pid: system.process.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 2
        });

    const process =
        system.processIO.getRequestProcess(
            request.id
        );

    assert(
        process === system.process,
        "Request should map back to its process."
    );

    const requests =
        system.processIO.getProcessRequest(
            system.process.pid
        );

    assert(
        requests.length === 1,
        "Process should have one tracked I/O request."
    );

    assert(
        requests[0].id === request.id,
        "Tracked request ID is incorrect."
    );

    console.log(
        "? Process/request mapping PASSED"
    );
}

function testQueuedIO() {
    const system =
        createSystem();

    const first =
        system.processIO.requestIO({
            pid: system.process.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    /*
     * Create a second process.
     */
    const second =
        system.processManager.createProcess({
            applicationId: "second-app",
            arrivalTime: 0,
            burstTime: 10
        });

    system.processManager.startProcess(
        second.pid
    );

    system.processManager.runProcess(
        second.pid
    );

    const secondRequest =
        system.processIO.requestIO({
            pid: second.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 2
        });

    assert(
        first.state ===
            IO_REQUEST_STATES.ACTIVE,
        "First I/O request should be active."
    );

    assert(
        secondRequest.state ===
            IO_REQUEST_STATES.QUEUED,
        "Second I/O request should be queued."
    );

    assert(
        second.state ===
            PROCESS_STATES.WAITING,
        "Second process should be waiting for I/O."
    );

    /*
     * Finish first request.
     */
    system.processIO.executeRequestUnit(
        first.id
    );

    system.processIO.executeRequestUnit(
        first.id
    );

    system.processIO.executeRequestUnit(
        first.id
    );

    assert(
        first.state ===
            IO_REQUEST_STATES.COMPLETED,
        "First request should complete."
    );

    assert(
        secondRequest.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Second request should automatically become active."
    );

    assert(
        second.state ===
            PROCESS_STATES.WAITING,
        "Second process should remain waiting while its I/O is active."
    );

    console.log(
        "? Queued I/O process waiting PASSED"
    );
}

function testCancellationWakesProcess() {
    const system =
        createSystem();

    /*
     * Occupy the disk first.
     */
    const first =
        system.processIO.requestIO({
            pid: system.process.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 5
        });

    const second =
        system.processManager.createProcess({
            applicationId: "second-app",
            arrivalTime: 0,
            burstTime: 10
        });

    system.processManager.startProcess(
        second.pid
    );

    system.processManager.runProcess(
        second.pid
    );

    const secondRequest =
        system.processIO.requestIO({
            pid: second.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 2
        });

    assert(
        second.state ===
            PROCESS_STATES.WAITING,
        "Second process should be waiting."
    );

    system.processIO.cancelRequest(
        secondRequest.id
    );

    assert(
        secondRequest.state ===
            IO_REQUEST_STATES.CANCELLED,
        "Second request should be cancelled."
    );

    assert(
        second.state ===
            PROCESS_STATES.READY,
        "Cancelled I/O should wake the waiting process."
    );

    assert(
        first.state ===
            IO_REQUEST_STATES.ACTIVE,
        "First request should remain active."
    );

    console.log(
        "? I/O cancellation ? READY transition PASSED"
    );
}

function testInvalidRequestFromReady() {
    const system =
        createSystem();

    system.processManager.preemptProcess(
        system.process.pid
    );

    assert(
        system.process.state ===
            PROCESS_STATES.READY,
        "Process should be READY after preemption."
    );

    let failed = false;

    try {
        system.processIO.requestIO({
            pid: system.process.pid,
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 2
        });
    } catch {
        failed = true;
    }

    assert(
        failed,
        "READY process must not directly request I/O."
    );

    assert(
        system.process.state ===
            PROCESS_STATES.READY,
        "Failed I/O request must not alter process state."
    );

    console.log(
        "? Invalid READY-process I/O protection PASSED"
    );
}

function testStatistics() {
    const system =
        createSystem();

    system.processIO.requestIO({
        pid: system.process.pid,
        deviceId: "disk-0",
        operation: IO_OPERATIONS.READ,
        duration: 4
    });

    const stats =
        system.processIO.getStatistics();

    assert(
        stats.waitingProcesses === 1,
        "Statistics should report one waiting process."
    );

    assert(
        stats.trackedRequests === 1,
        "Statistics should report one tracked request."
    );

    assert(
        stats.activeRequests === 1,
        "Statistics should report one active I/O request."
    );

    console.log(
        "? Process-I/O statistics PASSED"
    );
}

function testReset() {
    const system =
        createSystem();

    system.processIO.requestIO({
        pid: system.process.pid,
        deviceId: "disk-0",
        operation: IO_OPERATIONS.READ,
        duration: 4
    });

    system.processIO.reset();

    assert(
        system.processIO.getStatistics()
            .trackedRequests === 0,
        "Reset should clear request mappings."
    );

    assert(
        system.ioController
            .getActiveRequests()
            .length === 0,
        "Reset should clear active I/O requests."
    );

    assert(
        system.deviceManager
            .getAvailableDevices()
            .length === 1,
        "Reset should release the device."
    );

    console.log(
        "? Process-I/O reset PASSED"
    );
}

console.log(
    "========================================"
);

console.log(
    "NOVAOS PROCESS-I/O INTEGRATION TEST"
);

console.log(
    "========================================"
);

testRunningToWaiting();
testIOCompletionWakesProcess();
testRequestProcessMapping();
testQueuedIO();
testCancellationWakesProcess();
testInvalidRequestFromReady();
testStatistics();
testReset();

console.log();

console.log(
    "========================================"
);

console.log(
    "ALL PROCESS-I/O INTEGRATION TESTS PASSED"
);

console.log(
    "========================================"
);
