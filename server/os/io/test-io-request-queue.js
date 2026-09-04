import {
    IORequest,
    IO_OPERATIONS
} from "./IORequest.js";

import { IORequestQueue } from "./IORequestQueue.js";

console.log("========================================");
console.log("NOVAOS I/O REQUEST QUEUE TEST");
console.log("========================================");

const queue = new IORequestQueue();

const request1 = new IORequest({
    id: "io-2000",
    pid: "nova-1000",
    deviceId: "disk-0",
    operation: IO_OPERATIONS.READ,
    size: 1024,
    duration: 3
});

const request2 = new IORequest({
    id: "io-2001",
    pid: "nova-1001",
    deviceId: "disk-0",
    operation: IO_OPERATIONS.WRITE,
    size: 2048,
    duration: 2
});

const request3 = new IORequest({
    id: "io-2002",
    pid: "nova-1000",
    deviceId: "printer-0",
    operation: IO_OPERATIONS.WRITE,
    size: 512,
    duration: 4
});

/*
 * 1. Initial state
 */
if (
    !queue.isEmpty() ||
    queue.getSize() !== 0
) {
    throw new Error(
        "Initial queue state test failed."
    );
}

console.log("✓ Initial queue state PASSED");

/*
 * 2. Enqueue requests
 */
queue.enqueue(request1);
queue.enqueue(request2);
queue.enqueue(request3);

if (
    queue.getSize() !== 3 ||
    queue.isEmpty()
) {
    throw new Error(
        "Queue enqueue test failed."
    );
}

console.log("✓ Queue enqueue PASSED");

/*
 * 3. FIFO ordering
 */
if (
    queue.peek()?.id !== "io-2000"
) {
    throw new Error(
        "FIFO ordering test failed."
    );
}

console.log("✓ FIFO ordering PASSED");

/*
 * 4. Peek must not remove request
 */
if (
    queue.getSize() !== 3
) {
    throw new Error(
        "Queue peek preservation test failed."
    );
}

console.log("✓ Queue peek preservation PASSED");

/*
 * 5. Request lookup
 */
if (
    queue.getRequest("io-2001") !==
    request2
) {
    throw new Error(
        "Request lookup test failed."
    );
}

console.log("✓ Request lookup PASSED");

/*
 * 6. PID filtering
 */
const pidRequests =
    queue.getRequestsByPid(
        "nova-1000"
    );

if (
    pidRequests.length !== 2 ||
    !pidRequests.some(
        (request) =>
            request.id === "io-2000"
    ) ||
    !pidRequests.some(
        (request) =>
            request.id === "io-2002"
    )
) {
    throw new Error(
        "PID request filtering test failed."
    );
}

console.log("✓ PID filtering PASSED");

/*
 * 7. Device filtering
 */
const diskRequests =
    queue.getRequestsByDevice(
        "disk-0"
    );

if (
    diskRequests.length !== 2
) {
    throw new Error(
        "Device request filtering test failed."
    );
}

console.log("✓ Device filtering PASSED");

/*
 * 8. Dequeue
 */
const first =
    queue.dequeue();

if (
    first !== request1 ||
    queue.getSize() !== 2
) {
    throw new Error(
        "FIFO dequeue test failed."
    );
}

console.log("✓ FIFO dequeue PASSED");

/*
 * 9. Second dequeue
 */
const second =
    queue.dequeue();

if (
    second !== request2 ||
    queue.getSize() !== 1
) {
    throw new Error(
        "Second dequeue test failed."
    );
}

console.log("✓ Second dequeue PASSED");

/*
 * 10. Remove request
 */
const removed =
    queue.remove("io-2002");

if (
    removed !== true ||
    queue.getSize() !== 0 ||
    queue.getRequest("io-2002") !== null
) {
    throw new Error(
        "Request removal test failed."
    );
}

console.log("✓ Request removal PASSED");

/*
 * 11. Removing nonexistent request
 */
const missingRemoval =
    queue.remove("does-not-exist");

if (missingRemoval !== false) {
    throw new Error(
        "Missing request removal test failed."
    );
}

console.log(
    "✓ Missing request protection PASSED"
);

/*
 * 12. Duplicate request protection
 */
const duplicateRequest =
    new IORequest({
        id: "io-2003",
        pid: "nova-1002",
        deviceId: "disk-0",
        operation: IO_OPERATIONS.READ,
        duration: 1
    });

queue.enqueue(duplicateRequest);

let duplicateErrorCaught = false;

try {
    queue.enqueue(duplicateRequest);
} catch (error) {
    duplicateErrorCaught = true;
}

if (!duplicateErrorCaught) {
    throw new Error(
        "Duplicate request protection failed."
    );
}

console.log(
    "✓ Duplicate request protection PASSED"
);

/*
 * 13. Non-queued request protection
 */
duplicateRequest.start(0);

let stateErrorCaught = false;

try {
    queue.enqueue(duplicateRequest);
} catch (error) {
    stateErrorCaught = true;
}

if (!stateErrorCaught) {
    throw new Error(
        "Non-queued request protection failed."
    );
}

console.log(
    "✓ Non-queued request protection PASSED"
);

/*
 * 14. Statistics
 */
const statistics =
    queue.getStatistics();

if (
    statistics.queueLength !== 1 ||
    statistics.queuedRequests !== 0
) {
    /*
     * duplicateRequest is active,
     * so it remains in the queue but
     * is no longer a queued request.
     */
    throw new Error(
        "Queue statistics test failed."
    );
}

console.log("✓ Queue statistics PASSED");

/*
 * 15. JSON representation
 */
const json =
    queue.toJSON();

if (
    !Array.isArray(json) ||
    json.length !== 1 ||
    json[0].id !== "io-2003"
) {
    throw new Error(
        "Queue JSON representation test failed."
    );
}

console.log(
    "✓ Queue JSON representation PASSED"
);

/*
 * 16. Clear queue
 */
queue.clear();

if (
    !queue.isEmpty() ||
    queue.getSize() !== 0 ||
    queue.getAllRequests().length !== 0
) {
    throw new Error(
        "Queue clear test failed."
    );
}

console.log("✓ Queue clear PASSED");

/*
 * 17. Empty dequeue
 */
if (queue.dequeue() !== null) {
    throw new Error(
        "Empty queue dequeue test failed."
    );
}

console.log(
    "✓ Empty queue dequeue PASSED"
);

console.log("");
console.log("========================================");
console.log(
    "ALL I/O REQUEST QUEUE TESTS PASSED"
);
console.log("========================================");