import { Router } from "express";

import { Scheduler } from "../../os/scheduler/core/Scheduler.js";
import { Dispatcher } from "../../os/scheduler/core/Dispatcher.js";
import { SimulatedCPU } from "../../os/scheduler/core/SimulatedCPU.js";
import { SimulationEngine } from "../../os/scheduler/core/SimulationEngine.js";
import { ProcessManager } from "../../os/process/ProcessManager.js";

import { FCFS } from "../../os/scheduler/algorithms/FCFS.js";
import { SJF } from "../../os/scheduler/algorithms/SJF.js";
import { SRTF } from "../../os/scheduler/algorithms/SRTF.js";
import { RoundRobin } from "../../os/scheduler/algorithms/RoundRobin.js";
import { Priority } from "../../os/scheduler/algorithms/Priority.js";
import { PreemptivePriority } from "../../os/scheduler/algorithms/PreemptivePriority.js";

const router = Router();

/*
 * =========================================================
 * ALGORITHM FACTORY
 * =========================================================
 */

function createAlgorithm(name, timeQuantum = 2) {
    switch (String(name).toLowerCase()) {
        case "fcfs":
            return new FCFS();

        case "sjf":
            return new SJF();

        case "srtf":
            return new SRTF();

        case "round robin":
        case "round-robin":
        case "rr":
            return new RoundRobin(timeQuantum);

        case "priority":
            return new Priority();

        case "preemptive priority":
        case "preemptive-priority":
            return new PreemptivePriority();

        default:
            throw new Error(
                `Unknown scheduling algorithm '${name}'.`
            );
    }
}

/*
 * =========================================================
 * AVAILABLE ALGORITHMS
 * =========================================================
 */

router.get("/algorithms", (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: "fcfs",
                name: "FCFS",
                preemptive: false
            },
            {
                id: "sjf",
                name: "SJF",
                preemptive: false
            },
            {
                id: "srtf",
                name: "SRTF",
                preemptive: true
            },
            {
                id: "round-robin",
                name: "Round Robin",
                preemptive: true
            },
            {
                id: "priority",
                name: "Priority",
                preemptive: false
            },
            {
                id: "preemptive-priority",
                name: "Preemptive Priority",
                preemptive: true
            }
        ]
    });
});

/*
 * =========================================================
 * SIMULATE
 * =========================================================
 */

router.post("/simulate", (req, res) => {
    try {
        const {
            algorithm = "fcfs",
            timeQuantum = 2,
            processes = []
        } = req.body;

        if (!Array.isArray(processes)) {
            throw new Error(
                "Processes must be provided as an array."
            );
        }

        if (processes.length === 0) {
            throw new Error(
                "At least one process is required."
            );
        }

        /*
         * Each simulation gets its own isolated
         * ProcessManager, Scheduler, Dispatcher
         * and CPU.
         *
         * This prevents simulator processes from
         * affecting normal NovaOS processes.
         */
        const processManager =
            new ProcessManager();

        for (const process of processes) {
            if (
                !Number.isInteger(
                    Number(process.arrivalTime)
                ) ||
                Number(process.arrivalTime) < 0
            ) {
                throw new Error(
                    "Arrival time must be a non-negative integer."
                );
            }

            if (
                !Number.isInteger(
                    Number(process.burstTime)
                ) ||
                Number(process.burstTime) <= 0
            ) {
                throw new Error(
                    "Burst time must be a positive integer."
                );
            }

            processManager.createProcess({
                applicationId:
                    process.applicationId ??
                    `sim-${process.pid ?? "process"}`,

                priority:
                    Number(process.priority ?? 0),

                arrivalTime:
                    Number(process.arrivalTime),

                burstTime:
                    Number(process.burstTime)
            });
        }

        const scheduler =
            new Scheduler(processManager);

        scheduler.setAlgorithm(
            createAlgorithm(
                algorithm,
                Number(timeQuantum)
            )
        );

        const dispatcher =
            new Dispatcher(processManager);

        const cpu =
            new SimulatedCPU(processManager);

        const engine =
            new SimulationEngine({
                processManager,
                scheduler,
                dispatcher,
                cpu
            });

        const result =
            engine.run();

        /*
         * Preserve the user-supplied process labels
         * where possible.
         */
        const suppliedProcesses =
            processes.map(
                (process, index) => ({
                    pid:
                        process.pid ??
                        `P${index + 1}`
                })
            );

        result.processes =
            result.processes.map(
                (process, index) => ({
                    ...process,
                    displayPid:
                        suppliedProcesses[index]
                            ?.pid ?? process.pid
                })
            );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;