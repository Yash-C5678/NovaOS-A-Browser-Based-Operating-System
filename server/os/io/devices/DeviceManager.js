import { Device } from "./Device.js";

export class DeviceManager {
    constructor() {
        this.devices = new Map();
        this.nextDeviceNumber = 1;
    }

    registerDevice({
        id = null,
        name,
        type,
        status = "idle"
    }) {
        const deviceId =
            id ?? `device-${this.nextDeviceNumber++}`;

        if (this.devices.has(deviceId)) {
            throw new Error(
                `Device '${deviceId}' is already registered.`
            );
        }

        const device = new Device({
            id: deviceId,
            name,
            type,
            status
        });

        this.devices.set(device.id, device);

        return device;
    }

    getDevice(deviceId) {
        return this.devices.get(deviceId) ?? null;
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    getDevicesByType(type) {
        return this.getAllDevices().filter(
            (device) => device.type === type
        );
    }

    getAvailableDevices() {
        return this.getAllDevices().filter(
            (device) => device.isAvailable()
        );
    }

    getAvailableDevicesByType(type) {
        return this.getDevicesByType(type).filter(
            (device) => device.isAvailable()
        );
    }

    allocateDevice(deviceId, requestId) {
        const device = this.getDevice(deviceId);

        if (!device) {
            throw new Error(
                `Device '${deviceId}' not found.`
            );
        }

        device.startRequest(requestId);

        return device;
    }

    releaseDevice(deviceId) {
        const device = this.getDevice(deviceId);

        if (!device) {
            throw new Error(
                `Device '${deviceId}' not found.`
            );
        }

        device.completeRequest();

        return device;
    }

    setDeviceOffline(deviceId) {
        const device = this.getDevice(deviceId);

        if (!device) {
            throw new Error(
                `Device '${deviceId}' not found.`
            );
        }

        device.setOffline();

        return device;
    }

    setDeviceOnline(deviceId) {
        const device = this.getDevice(deviceId);

        if (!device) {
            throw new Error(
                `Device '${deviceId}' not found.`
            );
        }

        device.setOnline();

        return device;
    }

    removeDevice(deviceId) {
        const device = this.getDevice(deviceId);

        if (!device) {
            throw new Error(
                `Device '${deviceId}' not found.`
            );
        }

        if (device.isBusy()) {
            throw new Error(
                `Busy device '${deviceId}' cannot be removed.`
            );
        }

        this.devices.delete(deviceId);

        return true;
    }

    getDeviceCount() {
        return this.devices.size;
    }

    getBusyDevices() {
        return this.getAllDevices().filter(
            (device) => device.isBusy()
        );
    }

    getOfflineDevices() {
        return this.getAllDevices().filter(
            (device) => device.isOffline()
        );
    }

    getStatistics() {
        const devices =
            this.getAllDevices();

        const busyDevices =
            devices.filter(
                (device) => device.isBusy()
            ).length;

        const offlineDevices =
            devices.filter(
                (device) => device.isOffline()
            ).length;

        const availableDevices =
            devices.filter(
                (device) => device.isAvailable()
            ).length;

        return {
            totalDevices: devices.length,
            availableDevices,
            busyDevices,
            offlineDevices
        };
    }

    getDeviceTable() {
        return this.getAllDevices().map(
            (device) => device.toJSON()
        );
    }

    reset() {
        this.devices.clear();
        this.nextDeviceNumber = 1;
    }
}