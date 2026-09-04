import { SynchronizationManager } from "./core/SynchronizationManager.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function testMutexCreation() {
    const manager =
        new SynchronizationManager();

    const mutex =
        manager.createMutex("mutex-1");

    assert(
        mutex.id === "mutex-1",
        "Mutex ID is incorrect."
    );

    assert(
        mutex.isLocked() === false,
        "New mutex should be unlocked."
    );

    assert(
        mutex.getOwner() === null,
        "New mutex should have no owner."
    );

    console.log(
        "✓ Mutex creation PASSED"
    );
}

function testMutexAcquisition() {
    const manager =
        new SynchronizationManager();

    manager.createMutex("mutex-1");

    const acquired =
        manager.acquireMutex(
            "mutex-1",
            "nova-1000"
        );

    assert(
        acquired === true,
        "First mutex acquisition should succeed."
    );

    const mutex =
        manager.getMutex("mutex-1");

    assert(
        mutex.isLocked(),
        "Mutex should be locked."
    );

    assert(
        mutex.isOwnedBy("nova-1000"),
        "Mutex owner is incorrect."
    );

    console.log(
        "✓ Mutex acquisition PASSED"
    );
}

function testMutexWaitingQueue() {
    const manager =
        new SynchronizationManager();

    manager.createMutex("mutex-1");

    manager.acquireMutex(
        "mutex-1",
        "nova-1000"
    );

    const acquired =
        manager.acquireMutex(
            "mutex-1",
            "nova-1001"
        );

    assert(
        acquired === false,
        "Second process should not acquire a locked mutex."
    );

    const mutex =
        manager.getMutex("mutex-1");

    assert(
        mutex.getWaitingCount() === 1,
        "Mutex should have one waiting process."
    );

    assert(
        mutex.getWaitQueue()[0] ===
        "nova-1001",
        "Waiting process is incorrect."
    );

    console.log(
        "✓ Mutex waiting queue PASSED"
    );
}

function testMutexRelease() {
    const manager =
        new SynchronizationManager();

    manager.createMutex("mutex-1");

    manager.acquireMutex(
        "mutex-1",
        "nova-1000"
    );

    const nextProcess =
        manager.releaseMutex(
            "mutex-1",
            "nova-1000"
        );

    assert(
        nextProcess === null,
        "No waiting process should be returned."
    );

    const mutex =
        manager.getMutex("mutex-1");

    assert(
        mutex.isLocked() === false,
        "Mutex should be unlocked after release."
    );

    assert(
        mutex.getOwner() === null,
        "Mutex owner should be cleared."
    );

    console.log(
        "✓ Mutex release PASSED"
    );
}

function testMutexOwnershipProtection() {
    const manager =
        new SynchronizationManager();

    manager.createMutex("mutex-1");

    manager.acquireMutex(
        "mutex-1",
        "nova-1000"
    );

    let failed = false;

    try {
        manager.releaseMutex(
            "mutex-1",
            "nova-1001"
        );
    } catch {
        failed = true;
    }

    assert(
        failed,
        "A non-owner must not release a mutex."
    );

    assert(
        manager.getMutex("mutex-1")
            .isOwnedBy("nova-1000"),
        "Mutex ownership should remain unchanged."
    );

    console.log(
        "✓ Mutex ownership protection PASSED"
    );
}

function testSemaphoreCreation() {
    const manager =
        new SynchronizationManager();

    const semaphore =
        manager.createSemaphore({
            id: "sem-1",
            initialCount: 2
        });

    assert(
        semaphore.id === "sem-1",
        "Semaphore ID is incorrect."
    );

    assert(
        semaphore.getCount() === 2,
        "Initial semaphore count is incorrect."
    );

    console.log(
        "✓ Semaphore creation PASSED"
    );
}

function testSemaphoreWait() {
    const manager =
        new SynchronizationManager();

    manager.createSemaphore({
        id: "sem-1",
        initialCount: 2
    });

    const first =
        manager.waitSemaphore(
            "sem-1",
            "nova-1000"
        );

    const second =
        manager.waitSemaphore(
            "sem-1",
            "nova-1001"
        );

    assert(
        first === true,
        "First semaphore wait should succeed."
    );

    assert(
        second === true,
        "Second semaphore wait should succeed."
    );

    assert(
        manager.getSemaphore("sem-1")
            .getCount() === 0,
        "Semaphore count should reach zero."
    );

    console.log(
        "✓ Semaphore wait PASSED"
    );
}

function testSemaphoreBlocking() {
    const manager =
        new SynchronizationManager();

    manager.createSemaphore({
        id: "sem-1",
        initialCount: 1
    });

    manager.waitSemaphore(
        "sem-1",
        "nova-1000"
    );

    const acquired =
        manager.waitSemaphore(
            "sem-1",
            "nova-1001"
        );

    assert(
        acquired === false,
        "Semaphore wait should block when count is zero."
    );

    const semaphore =
        manager.getSemaphore("sem-1");

    assert(
        semaphore.getWaitingCount() === 1,
        "Blocked process should enter semaphore wait queue."
    );

    assert(
        semaphore.getWaitQueue()[0] ===
        "nova-1001",
        "Semaphore waiting process is incorrect."
    );

    console.log(
        "✓ Semaphore blocking PASSED"
    );
}

function testSemaphoreSignal() {
    const manager =
        new SynchronizationManager();

    manager.createSemaphore({
        id: "sem-1",
        initialCount: 1
    });

    manager.waitSemaphore(
        "sem-1",
        "nova-1000"
    );

    manager.waitSemaphore(
        "sem-1",
        "nova-1001"
    );

    const awakened =
        manager.signalSemaphore(
            "sem-1"
        );

    assert(
        awakened === "nova-1001",
        "Signal should wake the first waiting process."
    );

    assert(
        manager.getSemaphore("sem-1")
            .getCount() === 0,
        "Semaphore count should remain zero when waking a waiter."
    );

    assert(
        manager.getSemaphore("sem-1")
            .getWaitingCount() === 0,
        "Semaphore waiting queue should be empty."
    );

    console.log(
        "✓ Semaphore signal PASSED"
    );
}

function testStatistics() {
    const manager =
        new SynchronizationManager();

    manager.createMutex("mutex-1");
    manager.createMutex("mutex-2");

    manager.createSemaphore({
        id: "sem-1",
        initialCount: 1
    });

    manager.createSemaphore({
        id: "sem-2",
        initialCount: 2
    });

    manager.acquireMutex(
        "mutex-1",
        "nova-1000"
    );

    manager.acquireMutex(
        "mutex-1",
        "nova-1001"
    );

    manager.waitSemaphore(
        "sem-1",
        "nova-1002"
    );

    manager.waitSemaphore(
        "sem-1",
        "nova-1003"
    );

    const stats =
        manager.getStatistics();

    assert(
        stats.mutexCount === 2,
        "Mutex count is incorrect."
    );

    assert(
        stats.lockedMutexes === 1,
        "Locked mutex count is incorrect."
    );

    assert(
        stats.mutexWaitingProcesses === 1,
        "Mutex waiting process count is incorrect."
    );

    assert(
        stats.semaphoreCount === 2,
        "Semaphore count is incorrect."
    );

    assert(
        stats.semaphoreWaitingProcesses === 1,
        "Semaphore waiting process count is incorrect."
    );

    console.log(
        "✓ Synchronization statistics PASSED"
    );
}

function testReset() {
    const manager =
        new SynchronizationManager();

    manager.createMutex("mutex-1");

    manager.createSemaphore({
        id: "sem-1",
        initialCount: 1
    });

    manager.acquireMutex(
        "mutex-1",
        "nova-1000"
    );

    manager.waitSemaphore(
        "sem-1",
        "nova-1001"
    );

    manager.reset();

    const stats =
        manager.getStatistics();

    assert(
        stats.mutexCount === 0,
        "Reset should remove all mutexes."
    );

    assert(
        stats.semaphoreCount === 0,
        "Reset should remove all semaphores."
    );

    console.log(
        "✓ Synchronization reset PASSED"
    );
}

console.log(
    "========================================"
);

console.log(
    "NOVAOS SYNCHRONIZATION TEST"
);

console.log(
    "========================================"
);

testMutexCreation();
testMutexAcquisition();
testMutexWaitingQueue();
testMutexRelease();
testMutexOwnershipProtection();

testSemaphoreCreation();
testSemaphoreWait();
testSemaphoreBlocking();
testSemaphoreSignal();

testStatistics();
testReset();

console.log();

console.log(
    "========================================"
);

console.log(
    "ALL SYNCHRONIZATION TESTS PASSED"
);

console.log(
    "========================================"
);