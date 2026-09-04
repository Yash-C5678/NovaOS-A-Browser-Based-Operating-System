import { NovaRuntime } from "./runtime/NovaRuntime.js";

const runtime = new NovaRuntime();

runtime.registerApplication({
    id: "browser",
    name: "Nova Browser",
    version: "1.0.0",
    description: "NovaOS web browser",
    entryPoint: "browser"
});

runtime.registerApplication({
    id: "terminal",
    name: "Terminal",
    version: "1.0.0",
    description: "NovaOS terminal",
    entryPoint: "terminal"
});

const browser = runtime.launchApplication("browser");

runtime.runProcess(browser.process.pid);

runtime.focusWindow(browser.window.id);

console.log("\n=== APPLICATIONS ===");
console.log(runtime.listApplications());

console.log("\n=== PROCESSES ===");
console.log(runtime.getProcesses());

console.log("\n=== WINDOWS ===");
console.log(runtime.getWindows());

console.log("\n=== EVENTS ===");
console.log(runtime.getEvents());