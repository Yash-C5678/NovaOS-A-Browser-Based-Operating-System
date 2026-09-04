import { Kernel } from "./Kernel.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function testKernelCreation() {
    const kernel = new Kernel();

    assert(
        kernel.isBooted() === false,
        "Kernel should initially be stopped."
    );

    assert(
        kernel.getMemoryManager() !== null,
        "MemoryManager should be initialized."
    );

    assert(
        kernel.getProcessManager() !== null,
        "ProcessManager should be initialized."
    );

    assert(
        kernel.getDeviceManager() !== null,
        "DeviceManager should be initialized."
    );

    assert(
        kernel.getIOController() !== null,
        "IOController should be initialized."
    );

    assert(
        kernel.getProcessIOManager() !== null,
        "ProcessIOManager should be initialized."
    );

    assert(
        kernel.getSynchronizationManager() !== null,
        "SynchronizationManager should be initialized."
    );

    assert(
        kernel.getDeadlockManager() !== null,
        "DeadlockManager should be initialized."
    );

    console.log(
        "? Kernel subsystem initialization PASSED"
    );
}

function testKernelBoot() {
    const kernel = new Kernel();

    const firstBoot =
        kernel.boot();

    assert(
        firstBoot === true,
        "First kernel boot should succeed."
    );

    assert(
        kernel.isBooted() === true,
        "Kernel should be booted."
    );

    assert(
        kernel.bootTime instanceof Date,
        "Kernel boot time should be recorded."
    );

    const secondBoot =
        kernel.boot();

    assert(
        secondBoot === false,
        "Second boot should not reboot the kernel."
    );

    console.log(
        "? Kernel boot PASSED"
    );
}

function testApplicationLaunch() {
    const kernel = new Kernel({
        totalMemory: 2048
    });

    kernel.boot();

    kernel.registerApplication({
        id: "terminal",
        name: "Nova Terminal",
        version: "1.0.0",
        description: "NovaOS terminal",
        entryPoint: "terminal"
    });

    const result =
        kernel.launchApplication(
            "terminal"
        );

    assert(
        result.application.id ===
            "terminal",
        "Application should launch."
    );

    assert(
        result.process !== null,
        "Launched application should have a process."
    );

    assert(
        result.window !== null,
        "Launched application should have a window."
    );

    assert(
        result.process.state === "ready",
        "Launched process should be READY."
    );

    console.log(
        "? Application launch through kernel PASSED"
    );
}

function testMemoryIntegration() {
    const kernel = new Kernel({
        totalMemory: 2048
    });

    kernel.boot();

    kernel.registerApplication({
        id: "editor",
        name: "Nova Editor",
        version: "1.0.0",
        entryPoint: "editor"
    });

    const result =
        kernel.launchApplication(
            "editor"
        );

    const process =
        result.process;

    kernel.getMemoryManager().allocate(
        process.pid,
        256
    );

    assert(
        kernel.getMemoryManager()
            .hasAllocation(process.pid),
        "Process should have allocated memory."
    );

    assert(
        kernel.getMemoryManager()
            .getAllocatedMemory() === 256,
        "Allocated memory should be 256."
    );

    kernel.terminateProcess(
        process.pid
    );

    assert(
        !kernel.getMemoryManager()
            .hasAllocation(process.pid),
        "Process memory should be released on termination."
    );

    assert(
        kernel.getMemoryManager()
            .getFreeMemory() === 2048,
        "All memory should be free after termination."
    );

    console.log(
        "? Kernel memory integration PASSED"
    );
}

function testDeviceIntegration() {
    const kernel = new Kernel();

    kernel.boot();

    const device =
        kernel.getDeviceManager()
            .registerDevice({
                id: "disk-0",
                name: "System Disk",
                type: "storage"
            });

    assert(
        device.id === "disk-0",
        "Device should be registered through kernel."
    );

    assert(
        kernel.getDeviceManager()
            .getDevice("disk-0") !== null,
        "Kernel should expose registered device."
    );

    assert(
        kernel.getDeviceManager()
            .getAvailableDevices()
            .length === 1,
        "Registered device should initially be available."
    );

    console.log(
        "? Kernel device integration PASSED"
    );
}

function testSynchronizationIntegration() {
    const kernel = new Kernel();

    kernel.boot();

    const mutex =
        kernel.getSynchronizationManager()
            .createMutex("console-lock");

    assert(
        mutex.id === "console-lock",
        "Mutex should be created through kernel."
    );

    const acquired =
        kernel.getSynchronizationManager()
            .acquireMutex(
                "console-lock",
                "P1"
            );

    assert(
        acquired === true,
        "Mutex should be acquired."
    );

    assert(
        kernel.getSynchronizationManager()
            .getMutex("console-lock")
            .isOwnedBy("P1"),
        "Mutex ownership should be tracked."
    );

    console.log(
        "? Kernel synchronization integration PASSED"
    );
}

function testDeadlockIntegration() {
    const kernel = new Kernel();

    kernel.boot();

    const deadlock =
        kernel.getDeadlockManager();

    deadlock.registerResource({
        id: "R1",
        total: 1
    });

    deadlock.registerProcess({
        pid: "P1",
        maximum: [1]
    });

    deadlock.allocateResources(
        "P1",
        [1]
    );

    const safety =
        deadlock.checkSafety();

    assert(
        safety.safe === true,
        "Single process resource state should be safe."
    );

    assert(
        deadlock.getStatistics()
            .processCount === 1,
        "Kernel should expose deadlock process state."
    );

    console.log(
        "? Kernel deadlock integration PASSED"
    );
}

function testSystemState() {
    const kernel = new Kernel();

    kernel.boot();

    const state =
        kernel.getSystemState();

    assert(
        state.booted === true,
        "System state should report booted kernel."
    );

    assert(
        state.memory !== null,
        "System state should contain memory statistics."
    );

    assert(
        state.devices !== null,
        "System state should contain device statistics."
    );

    assert(
        state.io !== null,
        "System state should contain I/O statistics."
    );

    assert(
        state.processIO !== null,
        "System state should contain process-I/O statistics."
    );

    assert(
        state.synchronization !== null,
        "System state should contain synchronization statistics."
    );

    assert(
        state.deadlock !== null,
        "System state should contain deadlock statistics."
    );

    console.log(
        "? Unified system state PASSED"
    );
}

function testReset() {
    const kernel = new Kernel();

    kernel.boot();

    kernel.registerApplication({
        id: "test-app",
        name: "Test Application",
        version: "1.0.0",
        entryPoint: "test"
    });

    kernel.launchApplication(
        "test-app"
    );

    kernel.getDeviceManager()
        .registerDevice({
            id: "disk-0",
            name: "Disk",
            type: "storage"
        });

    kernel.getSynchronizationManager()
        .createMutex("test-lock");

    kernel.getDeadlockManager()
        .registerResource({
            id: "R1",
            total: 1
        });

    kernel.reset();

    assert(
        kernel.isBooted() === false,
        "Reset should stop the kernel."
    );

    assert(
        kernel.getRuntime()
            .listApplications()
            .length === 0,
        "Reset should remove applications."
    );

    assert(
        kernel.getProcessManager()
            .getAllProcesses()
            .length === 0,
        "Reset should remove processes."
    );

    assert(
        kernel.getDeviceManager()
            .getDeviceCount() === 0,
        "Reset should remove devices."
    );

    assert(
        kernel.getSynchronizationManager()
            .getStatistics()
            .mutexCount === 0,
        "Reset should remove mutexes."
    );

    assert(
        kernel.getDeadlockManager()
            .getStatistics()
            .resourceCount === 0,
        "Reset should remove deadlock resources."
    );

    assert(
        kernel.getIOController()
            .getActiveRequests()
            .length === 0,
        "Reset should remove active I/O requests."
    );

    console.log(
        "? Kernel reset PASSED"
    );
}

console.log(
    "========================================"
);

console.log(
    "NOVAOS KERNEL TEST"
);

console.log(
    "========================================"
);

testKernelCreation();
testKernelBoot();
testApplicationLaunch();
testMemoryIntegration();
testDeviceIntegration();
testSynchronizationIntegration();
testDeadlockIntegration();
testSystemState();
testReset();

console.log();

console.log(
    "========================================"
);

console.log(
    "ALL KERNEL TESTS PASSED"
);

console.log(
    "========================================"
);
