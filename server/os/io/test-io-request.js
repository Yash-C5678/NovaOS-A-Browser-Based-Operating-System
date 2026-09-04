import {
    IORequest,
    IO_REQUEST_STATES,
    IO_OPERATIONS
} from "./IORequest.js";

console.log("========================================");
console.log("NOVAOS I/O REQUEST TEST");
console.log("========================================");

/*
 * 1. Request creation
 */
const request = new IORequest({
    id: "io-1000",
    pid: "nova-1000",
    deviceId: "disk-0",
    operation: IO_OPERATIONS.READ,
    size: 4096,
    duration: 3
});

if (
    request.state !==
    IO_REQUEST_STATES.QUEUED
) {
    throw new Error(
        "Initial request state test failed."
    );
}

console.log("✓ Request creation PASSED");

/*
 * 2. Initial request properties
 */
if (
    request.pid !== "nova-1000" ||
    request.deviceId !== "disk-0" ||
    request.operation !== IO_OPERATIONS.READ ||
    request.size !== 4096 ||
    request.duration !== 3 ||
    request.elapsedTime !== 0 ||
    request.getRemainingTime() !== 3
) {
    throw new Error(
        "Request property test failed."
    );
}

console.log("✓ Request properties PASSED");

/*
 * 3. Start request
 */
request.start(10);

if (
    !request.isActive() ||
    request.state !==
        IO_REQUEST_STATES.ACTIVE ||
    request.startTime !== 10
) {
    throw new Error(
        "Request start test failed."
    );
}

console.log("✓ Request start PASSED");

/*
 * 4. Execute first unit
 */
const firstUnitComplete =
    request.executeUnit();

if (
    firstUnitComplete !== false ||
    request.elapsedTime !== 1 ||
    request.getRemainingTime() !== 2
) {
    throw new Error(
        "First I/O execution unit test failed."
    );
}

console.log("✓ First execution unit PASSED");

/*
 * 5. Execute second unit
 */
const secondUnitComplete =
    request.executeUnit();

if (
    secondUnitComplete !== false ||
    request.elapsedTime !== 2 ||
    request.getRemainingTime() !== 1
) {
    throw new Error(
        "Second I/O execution unit test failed."
    );
}

console.log("✓ Second execution unit PASSED");

/*
 * 6. Execute final unit
 */
const finalUnitComplete =
    request.executeUnit();

if (
    finalUnitComplete !== true ||
    request.elapsedTime !== 3 ||
    request.getRemainingTime() !== 0 ||
    !request.isComplete()
) {
    throw new Error(
        "Final I/O execution unit test failed."
    );
}

console.log("✓ Final execution unit PASSED");

/*
 * 7. Complete request
 */
request.complete(13);

if (
    !request.isCompleted() ||
    request.state !==
        IO_REQUEST_STATES.COMPLETED ||
    request.completionTime !== 13
) {
    throw new Error(
        "Request completion test failed."
    );
}

console.log("✓ Request completion PASSED");

/*
 * 8. Completed request cannot execute
 */
let executeErrorCaught = false;

try {
    request.executeUnit();
} catch (error) {
    executeErrorCaught = true;
}

if (!executeErrorCaught) {
    throw new Error(
        "Completed request execution protection failed."
    );
}

console.log(
    "✓ Completed request protection PASSED"
);

/*
 * 9. Cancel queued request
 */
const cancelRequest =
    new IORequest({
        id: "io-1001",
        pid: "nova-1001",
        deviceId: "printer-0",
        operation: IO_OPERATIONS.WRITE,
        size: 1024,
        duration: 2
    });

cancelRequest.cancel();

if (
    !cancelRequest.isCancelled() ||
    cancelRequest.state !==
        IO_REQUEST_STATES.CANCELLED
) {
    throw new Error(
        "Request cancellation test failed."
    );
}

console.log("✓ Request cancellation PASSED");

/*
 * 10. Cancelled request cannot start
 */
let startErrorCaught = false;

try {
    cancelRequest.start(20);
} catch (error) {
    startErrorCaught = true;
}

if (!startErrorCaught) {
    throw new Error(
        "Cancelled request start protection failed."
    );
}

console.log(
    "✓ Cancelled request protection PASSED"
);

/*
 * 11. Completed request cannot be cancelled
 */
let cancelErrorCaught = false;

try {
    request.cancel();
} catch (error) {
    cancelErrorCaught = true;
}

if (!cancelErrorCaught) {
    throw new Error(
        "Completed request cancellation protection failed."
    );
}

console.log(
    "✓ Completed request cancellation protection PASSED"
);

/*
 * 12. JSON representation
 */
const json =
    request.toJSON();

if (
    json.id !== "io-1000" ||
    json.pid !== "nova-1000" ||
    json.deviceId !== "disk-0" ||
    json.operation !== "read" ||
    json.size !== 4096 ||
    json.duration !== 3 ||
    json.elapsedTime !== 3 ||
    json.remainingTime !== 0 ||
    json.state !==
        IO_REQUEST_STATES.COMPLETED
) {
    throw new Error(
        "Request JSON representation test failed."
    );
}

console.log(
    "✓ Request JSON representation PASSED"
);

/*
 * 13. Invalid operation protection
 */
let operationErrorCaught = false;

try {
    new IORequest({
        id: "io-invalid-1",
        pid: "nova-1002",
        deviceId: "disk-0",
        operation: "delete"
    });
} catch (error) {
    operationErrorCaught = true;
}

if (!operationErrorCaught) {
    throw new Error(
        "Invalid operation protection failed."
    );
}

console.log(
    "✓ Invalid operation protection PASSED"
);

/*
 * 14. Invalid size protection
 */
let sizeErrorCaught = false;

try {
    new IORequest({
        id: "io-invalid-2",
        pid: "nova-1002",
        deviceId: "disk-0",
        operation: IO_OPERATIONS.READ,
        size: 0
    });
} catch (error) {
    sizeErrorCaught = true;
}

if (!sizeErrorCaught) {
    throw new Error(
        "Invalid size protection failed."
    );
}

console.log(
    "✓ Invalid size protection PASSED"
);

/*
 * 15. Invalid duration protection
 */
let durationErrorCaught = false;

try {
    new IORequest({
        id: "io-invalid-3",
        pid: "nova-1002",
        deviceId: "disk-0",
        operation: IO_OPERATIONS.READ,
        duration: 0
    });
} catch (error) {
    durationErrorCaught = true;
}

if (!durationErrorCaught) {
    throw new Error(
        "Invalid duration protection failed."
    );
}

console.log(
    "✓ Invalid duration protection PASSED"
);

console.log("");
console.log("========================================");
console.log(
    "ALL I/O REQUEST TESTS PASSED"
);
console.log("========================================");