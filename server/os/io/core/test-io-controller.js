import { IOController } from "./IOController.js";
import { DeviceManager } from "../devices/DeviceManager.js";
import {
    IO_REQUEST_STATES,
    IO_OPERATIONS
} from "../IORequest.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createController() {
    const deviceManager =
        new DeviceManager();

    deviceManager.registerDevice({
        id: "disk-0",
        name: "System Disk",
        type: "storage"
    });

    deviceManager.registerDevice({
        id: "printer-0",
        name: "System Printer",
        type: "printer"
    });

    return new IOController({
        deviceManager
    });
}

function testRequestSubmission() {
    const controller =
        createController();

    const request =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            size: 10,
            duration: 3
        });

    assert(
        request.id === "io-1000",
        "Request ID is incorrect."
    );

    assert(
        request.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Submitted request should become active."
    );

    assert(
        controller.getActiveRequests().length === 1,
        "Active request count should be 1."
    );

    console.log(
        "✓ Request submission and dispatch PASSED"
    );
}

function testExecutionAndCompletion() {
    const controller =
        createController();

    const request =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    controller.executeUnit(request.id);

    assert(
        request.elapsedTime === 1,
        "First execution unit failed."
    );

    assert(
        request.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Request should still be active after first unit."
    );

    controller.executeUnit(request.id);

    assert(
        request.elapsedTime === 2,
        "Second execution unit failed."
    );

    controller.executeUnit(request.id);

    assert(
        request.state ===
            IO_REQUEST_STATES.COMPLETED,
        "Request should be completed after final unit."
    );

    assert(
        controller.getActiveRequests().length === 0,
        "Completed request should not remain active."
    );

    assert(
        controller.getCompletedRequests().length === 1,
        "Completed request should be recorded."
    );

    assert(
        controller.deviceManager
            .getDevice("disk-0")
            .isAvailable(),
        "Device should be released after completion."
    );

    console.log(
        "✓ Request execution and completion PASSED"
    );
}

function testAutomaticNextDispatch() {
    const controller =
        createController();

    const first =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 2
        });

    const second =
        controller.submitRequest({
            pid: "nova-1001",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 1
        });

    assert(
        first.state ===
            IO_REQUEST_STATES.ACTIVE,
        "First request should be active."
    );

    assert(
        second.state ===
            IO_REQUEST_STATES.QUEUED,
        "Second request should initially be queued."
    );

    controller.executeUnit(first.id);

    assert(
        first.state ===
            IO_REQUEST_STATES.ACTIVE,
        "First request should still be active."
    );

    controller.executeUnit(first.id);

    assert(
        first.state ===
            IO_REQUEST_STATES.COMPLETED,
        "First request should complete."
    );

    assert(
        second.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Second request should automatically dispatch."
    );

    assert(
        controller.getActiveRequest(second.id) ===
            second,
        "Second request should be the active request."
    );

    console.log(
        "✓ Automatic next-request dispatch PASSED"
    );
}

function testMultipleDevices() {
    const controller =
        createController();

    const diskRequest =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    const printerRequest =
        controller.submitRequest({
            pid: "nova-1001",
            deviceId: "printer-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 2
        });

    assert(
        diskRequest.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Disk request should be active."
    );

    assert(
        printerRequest.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Printer request should be active."
    );

    assert(
        controller.getActiveRequests().length === 2,
        "Both independent devices should support active requests."
    );

    console.log(
        "✓ Multiple-device concurrency PASSED"
    );
}

function testBusyDeviceDoesNotBlockOtherDevice() {
    const controller =
        createController();

    const diskFirst =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    const diskSecond =
        controller.submitRequest({
            pid: "nova-1001",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 2
        });

    const printerRequest =
        controller.submitRequest({
            pid: "nova-1002",
            deviceId: "printer-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 1
        });

    assert(
        diskFirst.state ===
            IO_REQUEST_STATES.ACTIVE,
        "First disk request should be active."
    );

    assert(
        diskSecond.state ===
            IO_REQUEST_STATES.QUEUED,
        "Second disk request should remain queued."
    );

    assert(
        printerRequest.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Printer request should dispatch despite busy disk."
    );

    console.log(
        "✓ Busy-device isolation PASSED"
    );
}

function testCancellation() {
    const controller =
        createController();

    const request =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 5
        });

    /*
     * Occupy disk with first request.
     */
    const queuedRequest =
        controller.submitRequest({
            pid: "nova-1001",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.WRITE,
            duration: 2
        });

    assert(
        queuedRequest.state ===
            IO_REQUEST_STATES.QUEUED,
        "Second request should be queued."
    );

    controller.cancelRequest(
        queuedRequest.id
    );

    assert(
        queuedRequest.state ===
            IO_REQUEST_STATES.CANCELLED,
        "Queued request should be cancelled."
    );

    assert(
        controller.getCancelledRequests()
            .length === 1,
        "Cancelled request should be recorded."
    );

    assert(
        controller.getQueuedRequests()
            .length === 0,
        "Cancelled request should leave the queue."
    );

    assert(
        request.state ===
            IO_REQUEST_STATES.ACTIVE,
        "Original request should remain active."
    );

    console.log(
        "✓ Request cancellation PASSED"
    );
}

function testActiveCancellationProtection() {
    const controller =
        createController();

    const request =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 3
        });

    let failed = false;

    try {
        controller.cancelRequest(
            request.id
        );
    } catch {
        failed = true;
    }

    assert(
        failed,
        "Active request cancellation should be rejected."
    );

    console.log(
        "✓ Active cancellation protection PASSED"
    );
}

function testStatistics() {
    const controller =
        createController();

    controller.submitRequest({
        pid: "nova-1000",
        deviceId: "disk-0",
        operation: IO_OPERATIONS.READ,
        duration: 2
    });

    const stats =
        controller.getStatistics();

    assert(
        stats.activeRequests === 1,
        "Statistics should report one active request."
    );

    assert(
        stats.queuedRequests === 0,
        "Statistics should report zero queued requests."
    );

    assert(
        stats.completedRequests === 0,
        "Statistics should report zero completed requests."
    );

    assert(
        stats.cancelledRequests === 0,
        "Statistics should report zero cancelled requests."
    );

    assert(
        stats.devices.totalDevices === 2,
        "Statistics should report two devices."
    );

    assert(
        stats.devices.busyDevices === 1,
        "Statistics should report one busy device."
    );

    console.log(
        "✓ I/O statistics PASSED"
    );
}

function testReset() {
    const controller =
        createController();

    const request =
        controller.submitRequest({
            pid: "nova-1000",
            deviceId: "disk-0",
            operation: IO_OPERATIONS.READ,
            duration: 5
        });

    controller.executeUnit(
        request.id
    );

    controller.reset();

    assert(
        controller.getCurrentTime() === 0,
        "Reset should restore simulation time to zero."
    );

    assert(
        controller.getActiveRequests().length === 0,
        "Reset should clear active requests."
    );

    assert(
        controller.getQueuedRequests().length === 0,
        "Reset should clear queued requests."
    );

    assert(
        controller.getCompletedRequests().length === 0,
        "Reset should clear completed requests."
    );

    assert(
        controller.getCancelledRequests().length === 0,
        "Reset should clear cancelled requests."
    );

    assert(
        controller.deviceManager
            .getAvailableDevices().length === 2,
        "Reset should release all devices."
    );

    console.log(
        "✓ Controller reset PASSED"
    );
}

console.log(
    "========================================"
);

console.log(
    "NOVAOS I/O CONTROLLER TEST"
);

console.log(
    "========================================"
);

testRequestSubmission();
testExecutionAndCompletion();
testAutomaticNextDispatch();
testMultipleDevices();
testBusyDeviceDoesNotBlockOtherDevice();
testCancellation();
testActiveCancellationProtection();
testStatistics();
testReset();

console.log();

console.log(
    "========================================"
);

console.log(
    "ALL I/O CONTROLLER TESTS PASSED"
);

console.log(
    "========================================"
);