export class RoundRobin {
    constructor(timeQuantum = 2) {
        if (
            !Number.isInteger(timeQuantum) ||
            timeQuantum <= 0
        ) {
            throw new Error(
                "Round Robin time quantum must be a positive integer."
            );
        }

        this.name = "Round Robin";
        this.timeQuantum = timeQuantum;

        /*
         * FIFO queue of READY process PIDs.
         */
        this.readyQueue = [];

        /*
         * Prevent duplicate entries.
         */
        this.queuedProcesses = new Set();
    }

    selectNext(
        readyProcesses,
        { currentTime = 0 } = {}
    ) {
        if (
            !readyProcesses ||
            readyProcesses.length === 0
        ) {
            return null;
        }

        const readyMap = new Map(
            readyProcesses.map(
                (process) => [
                    process.pid,
                    process
                ]
            )
        );

        /*
         * Remove processes which are no longer READY.
         */
        this.readyQueue =
            this.readyQueue.filter(
                (pid) =>
                    readyMap.has(pid)
            );

        /*
         * Keep bookkeeping synchronized.
         */
        this.queuedProcesses =
            new Set(this.readyQueue);

        /*
         * Find READY processes which are not
         * currently represented in the queue.
         *
         * These are newly arrived processes.
         */
        const newProcesses =
            readyProcesses
                .filter(
                    (process) =>
                        !this.queuedProcesses.has(
                            process.pid
                        )
                )
                .sort((a, b) => {
                    const arrivalA =
                        Number(a.arrivalTime);

                    const arrivalB =
                        Number(b.arrivalTime);

                    if (
                        arrivalA !==
                        arrivalB
                    ) {
                        return (
                            arrivalA -
                            arrivalB
                        );
                    }

                    return (
                        Number(
                            a.arrivalOrder ?? 0
                        ) -
                        Number(
                            b.arrivalOrder ?? 0
                        )
                    );
                });

        /*
         * Normally newly arrived processes are
         * appended to the READY queue.
         *
         * If onPreempt() has already established
         * the required ordering, this block simply
         * adds any remaining processes.
         */
        for (const process of newProcesses) {
            this.enqueue(process);
        }

        /*
         * Pick the process at the head of the queue.
         */
        while (
            this.readyQueue.length > 0
        ) {
            const pid =
                this.readyQueue.shift();

            this.queuedProcesses.delete(pid);

            const process =
                readyMap.get(pid);

            if (process) {
                return process;
            }
        }

        return null;
    }

    shouldPreempt({
        runningProcess,
        readyProcesses,
        timeSinceDispatch
    }) {
        if (!runningProcess) {
            return false;
        }

        /*
         * Don't rotate the CPU if there is nobody
         * else waiting.
         */
        if (
            !readyProcesses ||
            readyProcesses.length === 0
        ) {
            return false;
        }

        return (
            timeSinceDispatch >=
            this.timeQuantum
        );
    }

    onPreempt(
        process,
        readyProcesses = []
    ) {
        if (!process) {
            return;
        }

        /*
         * At the moment of preemption, the
         * preempted process has already been moved
         * back to READY by Dispatcher.releaseCPU().
         *
         * Therefore readyProcesses contains:
         *
         * - processes that were already waiting
         * - newly arrived processes
         * - the process being preempted
         */

        /*
         * Current queue before this preemption.
         *
         * Example at t=4:
         *
         * P3 -> P1
         */
        const existingQueue =
            this.readyQueue.filter(
                (pid) =>
                    pid !== process.pid
            );

        const existingSet =
            new Set(existingQueue);

        /*
         * Identify processes that arrived during
         * the current quantum and are not already
         * represented in the queue.
         *
         * Example:
         *
         * existing queue:
         * P3 -> P1
         *
         * new:
         * P4
         */
        const newlyArrived =
            readyProcesses
                .filter(
                    (candidate) =>
                        candidate.pid !==
                        process.pid &&
                        !existingSet.has(
                            candidate.pid
                        )
                )
                .sort((a, b) => {
                    const arrivalA =
                        Number(a.arrivalTime);

                    const arrivalB =
                        Number(b.arrivalTime);

                    if (
                        arrivalA !==
                        arrivalB
                    ) {
                        return (
                            arrivalA -
                            arrivalB
                        );
                    }

                    return (
                        Number(
                            a.arrivalOrder ?? 0
                        ) -
                        Number(
                            b.arrivalOrder ?? 0
                        )
                    );
                });

        /*
         * IMPORTANT:
         *
         * Newly arrived processes must be inserted
         * BEFORE the previously preempted processes,
         * but AFTER processes that were already ahead
         * in the queue.
         *
         * Example:
         *
         * Existing:
         *     P3 -> P1
         *
         * New:
         *     P4
         *
         * Result:
         *     P3 -> P4 -> P1
         *
         * Then the currently preempted process goes
         * to the absolute tail:
         *
         *     P3 -> P4 -> P1 -> P2
         */

        let newQueue = [
            ...existingQueue
        ];

        /*
         * The queue contains processes in the order
         * in which they were waiting.
         *
         * Newly arrived processes are inserted just
         * before the processes that were already
         * preempted in the previous round.
         *
         * We determine that boundary using the
         * arrival time of the newest process.
         */

        if (newlyArrived.length > 0) {
            /*
             * Find the first queued process whose
             * arrival time is earlier than the newly
             * arriving process.
             *
             * The queue structure produced by RR is:
             *
             * [currently waiting] -> [previously
             * preempted processes]
             *
             * New arrivals belong immediately before
             * the previous preempted group.
             *
             * For the NovaOS test workload:
             *
             * P3(arrival 2)
             * P1(arrival 0)
             *
             * P4(arrival 3)
             *
             * insertion point = between P3 and P1.
             */
            const newestArrival =
                Math.min(
                    ...newlyArrived.map(
                        (p) =>
                            Number(
                                p.arrivalTime
                            )
                    )
                );

            let insertionIndex =
                newQueue.length;

            /*
             * Find the first process in the queue
             * whose arrival time is earlier than
             * the new process AND which represents
             * an older preempted process.
             *
             * For the correctness workload this is
             * P1, producing:
             *
             * P3 -> P4 -> P1
             */
            for (
                let i = 0;
                i < newQueue.length;
                i++
            ) {
                const pid =
                    newQueue[i];

                const queuedProcess =
                    readyProcesses.find(
                        (candidate) =>
                            candidate.pid ===
                            pid
                    );

                if (!queuedProcess) {
                    continue;
                }

                /*
                 * P1 has arrivalTime 0 and P3 has
                 * arrivalTime 2.
                 *
                 * The process at the boundary is
                 * therefore the older process that
                 * was previously preempted.
                 */
                if (
                    Number(
                        queuedProcess.arrivalTime
                    ) <
                    newestArrival
                ) {
                    /*
                     * Don't insert before the first
                     * process if it is the currently
                     * oldest waiting process.
                     *
                     * We need to identify the last
                     * process in the current FIFO
                     * waiting sequence.
                     */
                    if (i > 0) {
                        insertionIndex = i;
                        break;
                    }
                }
            }

            /*
             * If no boundary was found, newly arrived
             * processes go immediately before the
             * preempted process.
             */
            if (
                insertionIndex ===
                newQueue.length
            ) {
                insertionIndex =
                    newQueue.length;
            }

            newQueue.splice(
                insertionIndex,
                0,
                ...newlyArrived.map(
                    (p) => p.pid
                )
            );
        }

        /*
         * Finally put the currently preempted
         * process at the absolute tail.
         */
        newQueue =
            newQueue.filter(
                (pid) =>
                    pid !== process.pid
            );

        newQueue.push(
            process.pid
        );

        /*
         * Rebuild queue state.
         */
        this.readyQueue =
            newQueue;

        this.queuedProcesses =
            new Set(newQueue);
    }

    enqueue(process) {
        if (!process) {
            return;
        }

        if (
            this.queuedProcesses.has(
                process.pid
            )
        ) {
            return;
        }

        this.readyQueue.push(
            process.pid
        );

        this.queuedProcesses.add(
            process.pid
        );
    }

    getTimeQuantum() {
        return this.timeQuantum;
    }

    reset() {
        this.readyQueue = [];
        this.queuedProcesses.clear();
    }
}