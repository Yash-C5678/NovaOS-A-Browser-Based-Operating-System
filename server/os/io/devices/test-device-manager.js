import { DeviceManager } from "./DeviceManager.js";

console.log("========================================");
console.log("NOVAOS DEVICE MANAGER TEST");
console.log("========================================");

const manager = new DeviceManager();

/*
 * 1. Device registration
 */
const keyboard = manager.registerDevice({
    id: "keyboard-0",
    name: "Keyboard",
    type: "input"
});

const disk = manager.registerDevice({
    id: "disk-0",
    name: "System Disk",
    type: "storage"
});

const printer = manager.registerDevice({
    id: "printer-0",
    name: "Printer",
    type: "output"
});

if (manager.getDeviceCount() !== 3) {
    throw new Error(
        "Device registration test failed."
    );
}

console.log("✓ Device registration PASSED");

/*
 * 2. Device lookup
 */
if (
    manager.getDevice("keyboard-0") !==
    keyboard
) {
    throw new Error(
        "Device lookup test failed."
    );
}

console.log("✓ Device lookup PASSED");

/*
 * 3. Device type filtering
 */
if (
    manager.getDevicesByType("storage").length !==
    1
) {
    throw new Error(
        "Device type filtering test failed."
    );
}

console.log("✓ Device type filtering PASSED");

/*
 * 4. Initial availability
 */
if (
    manager.getAvailableDevices().length !==
    3
) {
    throw new Error(
        "Initial device availability test failed."
    );
}

console.log("✓ Initial availability PASSED");

/*
 * 5. Device allocation
 */
manager.allocateDevice(
    "disk-0",
    "request-1000"
);

if (!disk.isBusy()) {
    throw new Error(
        "Device allocation test failed."
    );
}

if (
    disk.currentRequestId !==
    "request-1000"
) {
    throw new Error(
        "Device request tracking test failed."
    );
}

console.log("✓ Device allocation PASSED");

/*
 * 6. Busy device protection
 */
let busyErrorCaught = false;

try {
    manager.allocateDevice(
        "disk-0",
        "request-1001"
    );
} catch (error) {
    busyErrorCaught = true;
}

if (!busyErrorCaught) {
    throw new Error(
        "Busy device protection test failed."
    );
}

console.log("✓ Busy device protection PASSED");

/*
 * 7. Release device
 */
manager.releaseDevice("disk-0");

if (!disk.isAvailable()) {
    throw new Error(
        "Device release test failed."
    );
}

if (
    disk.currentRequestId !== null
) {
    throw new Error(
        "Device request cleanup test failed."
    );
}

console.log("✓ Device release PASSED");

/*
 * 8. Offline / online
 */
manager.setDeviceOffline("printer-0");

if (!printer.isOffline()) {
    throw new Error(
        "Device offline test failed."
    );
}

manager.setDeviceOnline("printer-0");

if (!printer.isAvailable()) {
    throw new Error(
        "Device online test failed."
    );
}

console.log("✓ Offline/online management PASSED");

/*
 * 9. Busy device cannot go offline
 */
manager.allocateDevice(
    "keyboard-0",
    "request-1002"
);

let offlineErrorCaught = false;

try {
    manager.setDeviceOffline(
        "keyboard-0"
    );
} catch (error) {
    offlineErrorCaught = true;
}

if (!offlineErrorCaught) {
    throw new Error(
        "Busy device offline protection failed."
    );
}

manager.releaseDevice("keyboard-0");

console.log(
    "✓ Busy device offline protection PASSED"
);

/*
 * 10. Statistics
 */
const statistics =
    manager.getStatistics();

if (
    statistics.totalDevices !== 3 ||
    statistics.availableDevices !== 3 ||
    statistics.busyDevices !== 0 ||
    statistics.offlineDevices !== 0
) {
    throw new Error(
        "Device statistics test failed."
    );
}

console.log("✓ Device statistics PASSED");

/*
 * 11. Device table
 */
const table =
    manager.getDeviceTable();

if (
    !Array.isArray(table) ||
    table.length !== 3
) {
    throw new Error(
        "Device table test failed."
    );
}

console.log("✓ Device table PASSED");

/*
 * 12. Removal
 */
manager.removeDevice("printer-0");

if (manager.getDeviceCount() !== 2) {
    throw new Error(
        "Device removal test failed."
    );
}

console.log("✓ Device removal PASSED");

/*
 * 13. Reset
 */
manager.reset();

if (manager.getDeviceCount() !== 0) {
    throw new Error(
        "Device reset test failed."
    );
}

console.log("✓ Device reset PASSED");

console.log("");
console.log("========================================");
console.log(
    "ALL DEVICE MANAGER TESTS PASSED"
);
console.log("========================================");