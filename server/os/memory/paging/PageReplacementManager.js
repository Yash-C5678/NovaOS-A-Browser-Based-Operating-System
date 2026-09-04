import { EventEmitter } from "events";


/*
 * =========================================================
 * PAGE REPLACEMENT MANAGER
 * =========================================================
 *
 * Supports:
 *
 * 1. FIFO
 * 2. LRU
 * 3. OPTIMAL
 * 4. SECOND CHANCE
 * 5. CLOCK
 *
 * The manager provides two related capabilities:
 *
 * - simulate(referenceString, frameCount)
 *      Educational page-replacement simulation.
 *
 * - selectVictim(pages, context)
 *      Runtime victim selection for Virtual Memory.
 *
 * PagingManager remains responsible for physical memory.
 * This class owns replacement POLICY only.
 * =========================================================
 */


export const PAGE_REPLACEMENT_ALGORITHMS =
    Object.freeze({
        FIFO: "fifo",
        LRU: "lru",
        OPTIMAL: "optimal",
        SECOND_CHANCE: "second-chance",
        CLOCK: "clock"
    });


const VALID_ALGORITHMS =
    new Set(
        Object.values(
            PAGE_REPLACEMENT_ALGORITHMS
        )
    );


function normalizeAlgorithm(
    algorithm
) {
    const normalized =
        String(
            algorithm ??
            PAGE_REPLACEMENT_ALGORITHMS.FIFO
        )
            .trim()
            .toLowerCase()
            .replace(
                /_/g,
                "-"
            )
            .replace(
                /\s+/g,
                "-"
            );

    /*
     * Accept common aliases.
     */

    if (
        normalized === "secondchance"
    ) {
        return PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE;
    }

    if (
        normalized === "second-chance"
    ) {
        return PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE;
    }

    if (
        normalized === "opt"
    ) {
        return PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL;
    }

    if (
        normalized === "min"
    ) {
        return PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL;
    }

    if (
        normalized === "sc"
    ) {
        return PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE;
    }

    if (
        !VALID_ALGORITHMS.has(
            normalized
        )
    ) {
        throw new Error(
            `Unsupported page replacement algorithm: ${algorithm}. ` +
            `Supported algorithms: fifo, lru, optimal, second-chance, clock.`
        );
    }

    return normalized;
}


function normalizeReferenceString(
    referenceString
) {
    if (
        typeof referenceString ===
        "string"
    ) {
        const values =
            referenceString
                .split(
                    /[\s,]+/
                )
                .filter(
                    (value) =>
                        value.length > 0
                )
                .map(
                    (value) =>
                        Number(value)
                );

        if (
            values.some(
                (value) =>
                    !Number.isInteger(
                        value
                    ) ||
                    value < 0
            )
        ) {
            throw new Error(
                "Reference string must contain only non-negative integer page numbers."
            );
        }

        return values;
    }


    if (
        Array.isArray(
            referenceString
        )
    ) {
        const values =
            referenceString.map(
                (value) =>
                    Number(value)
            );

        if (
            values.some(
                (value) =>
                    !Number.isInteger(
                        value
                    ) ||
                    value < 0
            )
        ) {
            throw new Error(
                "Reference string must contain only non-negative integer page numbers."
            );
        }

        return values;
    }


    throw new Error(
        "Reference string must be an array or a whitespace/comma-separated string."
    );
}


function validateFrameCount(
    frameCount
) {
    const numeric =
        Number(
            frameCount
        );

    if (
        !Number.isInteger(
            numeric
        ) ||
        numeric <= 0
    ) {
        throw new Error(
            "frameCount must be a positive integer."
        );
    }

    return numeric;
}


function cloneFrames(
    frames
) {
    return frames.map(
        (frame) =>
            frame === null
                ? null
                : frame
    );
}


function cloneReferenceBits(
    referenceBits
) {
    return referenceBits.map(
        (value) =>
            value ? 1 : 0
    );
}


function createSimulationStep({
    index,
    referencedPage,
    frames,
    pageFault,
    pageHit,
    replacedPage,
    algorithm,
    referenceBits = null,
    pointer = null
}) {
    return {
        step:
            index + 1,

        referenceIndex:
            index,

        referencedPage,

        frames:
            cloneFrames(
                frames
            ),

        pageFault,

        pageHit,

        replacedPage:
            replacedPage ??
            null,

        algorithm,

        referenceBits:
            Array.isArray(
                referenceBits
            )
                ? cloneReferenceBits(
                    referenceBits
                )
                : null,

        pointer:
            Number.isInteger(
                pointer
            )
                ? pointer
                : null
    };
}


export class PageReplacementManager {

    constructor({
        defaultAlgorithm =
            PAGE_REPLACEMENT_ALGORITHMS.FIFO
    } = {}) {

        this.defaultAlgorithm =
            normalizeAlgorithm(
                defaultAlgorithm
            );


        this.statistics = {
            simulations: 0,

            totalReferences: 0,

            totalPageHits: 0,

            totalPageFaults: 0,

            totalReplacements: 0,

            fifoSimulations: 0,

            lruSimulations: 0,

            optimalSimulations: 0,

            secondChanceSimulations: 0,

            clockSimulations: 0
        };


        this.lastSimulation =
            null;


        /*
         * Runtime Clock hand.
         *
         * The hand is reset when no resident pages remain
         * or when the manager itself is reset.
         */

        this.clockHand =
            0;


        this.events =
            new EventEmitter();
    }


    /*
     * =========================================================
     * EVENT API
     * =========================================================
     */

    on(
        eventName,
        listener
    ) {
        return this.events.on(
            eventName,
            listener
        );
    }


    once(
        eventName,
        listener
    ) {
        return this.events.once(
            eventName,
            listener
        );
    }


    off(
        eventName,
        listener
    ) {
        return this.events.off(
            eventName,
            listener
        );
    }


    emit(
        eventName,
        payload
    ) {
        this.events.emit(
            eventName,
            payload
        );
    }


    /*
     * =========================================================
     * ALGORITHM HELPERS
     * =========================================================
     */

    setDefaultAlgorithm(
        algorithm
    ) {
        this.defaultAlgorithm =
            normalizeAlgorithm(
                algorithm
            );

        this.emit(
            "algorithm-changed",
            {
                algorithm:
                    this.defaultAlgorithm
            }
        );

        return this.defaultAlgorithm;
    }


    getDefaultAlgorithm() {
        return this.defaultAlgorithm;
    }


    getSupportedAlgorithms() {
        return [
            {
                id:
                    PAGE_REPLACEMENT_ALGORITHMS.FIFO,

                name:
                    "FIFO",

                description:
                    "Replaces the page that has been resident for the longest time."
            },

            {
                id:
                    PAGE_REPLACEMENT_ALGORITHMS.LRU,

                name:
                    "LRU",

                description:
                    "Replaces the page that has not been referenced for the longest time."
            },

            {
                id:
                    PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL,

                name:
                    "Optimal",

                description:
                    "Replaces the page whose next reference is farthest in the future."
            },

            {
                id:
                    PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE,

                name:
                    "Second Chance",

                description:
                    "FIFO replacement that gives referenced pages another chance before replacement."
            },

            {
                id:
                    PAGE_REPLACEMENT_ALGORITHMS.CLOCK,

                name:
                    "Clock",

                description:
                    "Circular Second Chance replacement using a clock hand and reference bits."
            }
        ];
    }


    /*
     * =========================================================
     * PAGE METADATA NORMALIZATION
     * =========================================================
     */

    normalizeResidentPages(
        pages
    ) {
        if (
            !Array.isArray(
                pages
            )
        ) {
            return [];
        }

        return pages.filter(
            (page) =>
                page &&
                (
                    page.resident ===
                    true ||

                    (
                        page.frameNumber !==
                        null &&

                        page.frameNumber !==
                        undefined
                    )
                )
        );
    }


    getPageNumber(
        page
    ) {
        const number =
            Number(
                page?.pageNumber
            );

        return Number.isInteger(
            number
        )
            ? number
            : Number.MAX_SAFE_INTEGER;
    }


    getLoadTime(
        page
    ) {
        const value =
            Number(
                page?.loadedAt
            );

        if (
            Number.isFinite(
                value
            )
        ) {
            return value;
        }


        const alternative =
            Number(
                page?.loadOrder
            );

        if (
            Number.isFinite(
                alternative
            )
        ) {
            return alternative;
        }


        return 0;
    }


    getLastReferenceTime(
        page
    ) {
        const value =
            Number(
                page?.lastReferencedAt
            );

        if (
            Number.isFinite(
                value
            )
        ) {
            return value;
        }


        const alternative =
            Number(
                page?.lastReference
            );

        if (
            Number.isFinite(
                alternative
            )
        ) {
            return alternative;
        }


        return this.getLoadTime(
            page
        );
    }


    isReferenced(
        page
    ) {
        return (
            page?.referenced ===
            true ||

            page?.referenceBit ===
            1 ||

            page?.referenceBit ===
            true
        );
    }


    /*
     * =========================================================
     * FIFO VICTIM
     * =========================================================
     */

    selectFIFOVictim(
        pages
    ) {
        const candidates =
            this.normalizeResidentPages(
                pages
            );

        if (
            candidates.length ===
            0
        ) {
            return null;
        }


        return (
            candidates
                .slice()
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const firstTime =
                            this.getLoadTime(
                                first
                            );

                        const secondTime =
                            this.getLoadTime(
                                second
                            );


                        if (
                            firstTime !==
                            secondTime
                        ) {
                            return (
                                firstTime -
                                secondTime
                            );
                        }


                        return (
                            this.getPageNumber(
                                first
                            ) -
                            this.getPageNumber(
                                second
                            )
                        );
                    }
                )[0] ??

            null
        );
    }


    /*
     * =========================================================
     * LRU VICTIM
     * =========================================================
     */

    selectLRUVictim(
        pages
    ) {
        const candidates =
            this.normalizeResidentPages(
                pages
            );

        if (
            candidates.length ===
            0
        ) {
            return null;
        }


        return (
            candidates
                .slice()
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const firstTime =
                            this.getLastReferenceTime(
                                first
                            );

                        const secondTime =
                            this.getLastReferenceTime(
                                second
                            );


                        if (
                            firstTime !==
                            secondTime
                        ) {
                            return (
                                firstTime -
                                secondTime
                            );
                        }


                        return (
                            this.getPageNumber(
                                first
                            ) -
                            this.getPageNumber(
                                second
                            )
                        );
                    }
                )[0] ??

            null
        );
    }


    /*
     * =========================================================
     * OPTIMAL VICTIM
     * =========================================================
     */

    selectOptimalVictim(
        pages,
        {
            referenceString = [],
            currentIndex = -1
        } = {}
    ) {
        const candidates =
            this.normalizeResidentPages(
                pages
            );

        if (
            candidates.length ===
            0
        ) {
            return null;
        }


        const references =
            normalizeReferenceString(
                referenceString
            );


        let bestPage =
            null;


        let bestNextUse =
            -1;


        for (
            const page
            of candidates
        ) {

            const pageNumber =
                this.getPageNumber(
                    page
                );


            let nextUse =
                Number.POSITIVE_INFINITY;


            for (
                let index =
                    Math.max(
                        0,
                        currentIndex + 1
                    );

                index <
                references.length;

                index++
            ) {

                if (
                    references[
                        index
                    ] ===
                    pageNumber
                ) {

                    nextUse =
                        index;

                    break;
                }
            }


            /*
             * A page that will never be referenced again
             * is the best possible victim.
             */

            if (
                nextUse ===
                Number.POSITIVE_INFINITY
            ) {
                return page;
            }


            if (
                nextUse >
                bestNextUse ||

                (
                    nextUse ===
                    bestNextUse &&

                    (
                        bestPage ===
                        null ||

                        pageNumber <
                        this.getPageNumber(
                            bestPage
                        )
                    )
                )
            ) {

                bestPage =
                    page;

                bestNextUse =
                    nextUse;
            }
        }


        return bestPage;
    }


    /*
     * =========================================================
     * SECOND CHANCE VICTIM
     * =========================================================
     *
     * Second Chance is FIFO plus a reference bit.
     *
     * Pages are considered in FIFO order.
     *
     * If reference bit = 0:
     *     replace it.
     *
     * If reference bit = 1:
     *     clear the reference bit and give the page
     *     another chance.
     *
     * This implementation operates on the supplied page
     * metadata and therefore works for runtime VM pages.
     * =========================================================
     */

    selectSecondChanceVictim(
        pages
    ) {
        const candidates =
            this.normalizeResidentPages(
                pages
            )
                .slice()
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const firstTime =
                            this.getLoadTime(
                                first
                            );

                        const secondTime =
                            this.getLoadTime(
                                second
                            );


                        if (
                            firstTime !==
                            secondTime
                        ) {
                            return (
                                firstTime -
                                secondTime
                            );
                        }


                        return (
                            this.getPageNumber(
                                first
                            ) -
                            this.getPageNumber(
                                second
                            )
                        );
                    }
                );


        if (
            candidates.length ===
            0
        ) {
            return null;
        }


        /*
         * We may need multiple passes when every page has
         * its reference bit set.
         */

        const maximumScans =
            candidates.length * 2;


        for (
            let scan = 0;
            scan < maximumScans;
            scan++
        ) {

            const page =
                candidates[
                    scan %
                    candidates.length
                ];


            if (
                !this.isReferenced(
                    page
                )
            ) {
                return page;
            }


            /*
             * Give this page a second chance.
             *
             * Mutating the supplied metadata is intentional:
             * the page's reference bit has been consumed by
             * the replacement scan.
             */

            page.referenced =
                false;

            page.referenceBit =
                0;
        }


        /*
         * If every page remained referenced for some reason,
         * FIFO remains the deterministic fallback.
         */

        return (
            candidates[0] ??
            null
        );
    }


    /*
     * =========================================================
     * CLOCK VICTIM
     * =========================================================
     *
     * Clock is the circular implementation of Second Chance.
     *
     * The manager keeps a clock hand between runtime
     * replacement operations.
     * =========================================================
     */

    selectClockVictim(
        pages
    ) {
        const candidates =
            this.normalizeResidentPages(
                pages
            )
                .slice()
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const firstFrame =
                            Number(
                                first?.frameNumber
                            );

                        const secondFrame =
                            Number(
                                second?.frameNumber
                            );


                        if (
                            Number.isFinite(
                                firstFrame
                            ) &&
                            Number.isFinite(
                                secondFrame
                            ) &&
                            firstFrame !==
                            secondFrame
                        ) {
                            return (
                                firstFrame -
                                secondFrame
                            );
                        }


                        const firstTime =
                            this.getLoadTime(
                                first
                            );

                        const secondTime =
                            this.getLoadTime(
                                second
                            );


                        if (
                            firstTime !==
                            secondTime
                        ) {
                            return (
                                firstTime -
                                secondTime
                            );
                        }


                        return (
                            this.getPageNumber(
                                first
                            ) -
                            this.getPageNumber(
                                second
                            )
                        );
                    }
                );


        if (
            candidates.length ===
            0
        ) {
            this.clockHand =
                0;

            return null;
        }


        /*
         * Normalize the hand when the resident set changes.
         */

        this.clockHand =
            (
                this.clockHand %
                candidates.length +
                candidates.length
            ) %
            candidates.length;


        const maximumScans =
            candidates.length * 2;


        for (
            let scan = 0;
            scan < maximumScans;
            scan++
        ) {

            const index =
                (
                    this.clockHand +
                    scan
                ) %
                candidates.length;


            const page =
                candidates[
                    index
                ];


            if (
                !this.isReferenced(
                    page
                )
            ) {

                /*
                 * The replacement occurs here.
                 *
                 * The next clock position begins after
                 * the selected victim.
                 */

                this.clockHand =
                    (
                        index + 1
                    ) %
                    candidates.length;


                return page;
            }


            /*
             * Reference bit = 1:
             * clear it and continue around the circle.
             */

            page.referenced =
                false;

            page.referenceBit =
                0;
        }


        /*
         * Deterministic fallback.
         */

        const victim =
            candidates[
                this.clockHand
            ] ??
            null;


        if (
            victim
        ) {
            this.clockHand =
                (
                    this.clockHand + 1
                ) %
                candidates.length;
        }


        return victim;
    }


    /*
     * =========================================================
     * GENERIC VICTIM SELECTION
     * =========================================================
     */

    selectVictim(
        pages,
        {
            algorithm =
                this.defaultAlgorithm,

            referenceString = [],

            currentIndex = -1
        } = {}
    ) {
        const selectedAlgorithm =
            normalizeAlgorithm(
                algorithm
            );


        switch (
            selectedAlgorithm
        ) {

            case PAGE_REPLACEMENT_ALGORITHMS.FIFO:

                return this.selectFIFOVictim(
                    pages
                );


            case PAGE_REPLACEMENT_ALGORITHMS.LRU:

                return this.selectLRUVictim(
                    pages
                );


            case PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL:

                return this.selectOptimalVictim(
                    pages,
                    {
                        referenceString,
                        currentIndex
                    }
                );


            case PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE:

                return this.selectSecondChanceVictim(
                    pages
                );


            case PAGE_REPLACEMENT_ALGORITHMS.CLOCK:

                return this.selectClockVictim(
                    pages
                );


            default:

                throw new Error(
                    `Unsupported page replacement algorithm: ${selectedAlgorithm}`
                );
        }
    }


    /*
     * =========================================================
     * FIFO SIMULATION
     * =========================================================
     */

    simulateFIFO(
        referenceString,
        frameCount
    ) {
        const references =
            normalizeReferenceString(
                referenceString
            );


        const frames =
            Array(
                validateFrameCount(
                    frameCount
                )
            )
                .fill(null);


        const queue =
            [];


        const steps =
            [];


        let pageFaults =
            0;


        let pageHits =
            0;


        let replacements =
            0;


        for (
            let index = 0;
            index <
            references.length;
            index++
        ) {

            const page =
                references[index];


            const existingIndex =
                frames.indexOf(
                    page
                );


            let pageFault =
                false;


            let replacedPage =
                null;


            if (
                existingIndex !==
                -1
            ) {

                pageHits++;

            } else {

                pageFaults++;

                pageFault =
                    true;


                const freeIndex =
                    frames.findIndex(
                        (
                            value
                        ) =>
                            value ===
                            null
                    );


                if (
                    freeIndex !==
                    -1
                ) {

                    frames[
                        freeIndex
                    ] =
                        page;


                    queue.push(
                        freeIndex
                    );

                } else {

                    const victimIndex =
                        queue.shift();


                    replacedPage =
                        frames[
                            victimIndex
                        ];


                    frames[
                        victimIndex
                    ] =
                        page;


                    queue.push(
                        victimIndex
                    );


                    replacements++;
                }
            }


            steps.push(
                createSimulationStep({
                    index,

                    referencedPage:
                        page,

                    frames,

                    pageFault,

                    pageHit:
                        !pageFault,

                    replacedPage,

                    algorithm:
                        PAGE_REPLACEMENT_ALGORITHMS.FIFO
                })
            );
        }


        return this.buildResult({
            algorithm:
                PAGE_REPLACEMENT_ALGORITHMS.FIFO,

            frameCount:
                frames.length,

            referenceString:
                references,

            frames,

            steps,

            pageFaults,

            pageHits,

            replacements
        });
    }


    /*
     * =========================================================
     * LRU SIMULATION
     * =========================================================
     */

    simulateLRU(
        referenceString,
        frameCount
    ) {
        const references =
            normalizeReferenceString(
                referenceString
            );


        const frames =
            Array(
                validateFrameCount(
                    frameCount
                )
            )
                .fill(null);


        const lastUsed =
            new Map();


        const steps =
            [];


        let pageFaults =
            0;


        let pageHits =
            0;


        let replacements =
            0;


        for (
            let index = 0;
            index <
            references.length;
            index++
        ) {

            const page =
                references[index];


            const existingIndex =
                frames.indexOf(
                    page
                );


            let pageFault =
                false;


            let replacedPage =
                null;


            if (
                existingIndex !==
                -1
            ) {

                pageHits++;


                lastUsed.set(
                    page,
                    index
                );

            } else {

                pageFaults++;


                pageFault =
                    true;


                const freeIndex =
                    frames.findIndex(
                        (
                            value
                        ) =>
                            value ===
                            null
                    );


                if (
                    freeIndex !==
                    -1
                ) {

                    frames[
                        freeIndex
                    ] =
                        page;

                } else {

                    let victimIndex =
                        0;


                    let oldestUse =
                        Number.POSITIVE_INFINITY;


                    for (
                        let frameIndex = 0;
                        frameIndex <
                        frames.length;
                        frameIndex++
                    ) {

                        const framePage =
                            frames[
                                frameIndex
                            ];


                        const usedAt =
                            lastUsed.has(
                                framePage
                            )
                                ? lastUsed.get(
                                    framePage
                                )
                                : -1;


                        if (
                            usedAt <
                            oldestUse
                        ) {

                            oldestUse =
                                usedAt;


                            victimIndex =
                                frameIndex;
                        }
                    }


                    replacedPage =
                        frames[
                            victimIndex
                        ];


                    frames[
                        victimIndex
                    ] =
                        page;


                    replacements++;
                }


                lastUsed.set(
                    page,
                    index
                );
            }


            steps.push(
                createSimulationStep({
                    index,

                    referencedPage:
                        page,

                    frames,

                    pageFault,

                    pageHit:
                        !pageFault,

                    replacedPage,

                    algorithm:
                        PAGE_REPLACEMENT_ALGORITHMS.LRU
                })
            );
        }


        return this.buildResult({
            algorithm:
                PAGE_REPLACEMENT_ALGORITHMS.LRU,

            frameCount:
                frames.length,

            referenceString:
                references,

            frames,

            steps,

            pageFaults,

            pageHits,

            replacements
        });
    }


    /*
     * =========================================================
     * OPTIMAL SIMULATION
     * =========================================================
     */

    simulateOptimal(
        referenceString,
        frameCount
    ) {
        const references =
            normalizeReferenceString(
                referenceString
            );


        const frames =
            Array(
                validateFrameCount(
                    frameCount
                )
            )
                .fill(null);


        const steps =
            [];


        let pageFaults =
            0;


        let pageHits =
            0;


        let replacements =
            0;


        for (
            let index = 0;
            index <
            references.length;
            index++
        ) {

            const page =
                references[index];


            const existingIndex =
                frames.indexOf(
                    page
                );


            let pageFault =
                false;


            let replacedPage =
                null;


            if (
                existingIndex !==
                -1
            ) {

                pageHits++;

            } else {

                pageFaults++;


                pageFault =
                    true;


                const freeIndex =
                    frames.findIndex(
                        (
                            value
                        ) =>
                            value ===
                            null
                    );


                if (
                    freeIndex !==
                    -1
                ) {

                    frames[
                        freeIndex
                    ] =
                        page;

                } else {

                    let victimIndex =
                        0;


                    let farthestNextUse =
                        -1;


                    for (
                        let frameIndex = 0;
                        frameIndex <
                        frames.length;
                        frameIndex++
                    ) {

                        const framePage =
                            frames[
                                frameIndex
                            ];


                        let nextUse =
                            Number.POSITIVE_INFINITY;


                        for (
                            let futureIndex =
                                index + 1;

                            futureIndex <
                            references.length;

                            futureIndex++
                        ) {

                            if (
                                references[
                                    futureIndex
                                ] ===
                                framePage
                            ) {

                                nextUse =
                                    futureIndex;

                                break;
                            }
                        }


                        if (
                            nextUse ===
                            Number.POSITIVE_INFINITY
                        ) {

                            victimIndex =
                                frameIndex;

                            farthestNextUse =
                                nextUse;

                            break;
                        }


                        if (
                            nextUse >
                            farthestNextUse
                        ) {

                            farthestNextUse =
                                nextUse;

                            victimIndex =
                                frameIndex;
                        }
                    }


                    replacedPage =
                        frames[
                            victimIndex
                        ];


                    frames[
                        victimIndex
                    ] =
                        page;


                    replacements++;
                }
            }


            steps.push(
                createSimulationStep({
                    index,

                    referencedPage:
                        page,

                    frames,

                    pageFault,

                    pageHit:
                        !pageFault,

                    replacedPage,

                    algorithm:
                        PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL
                })
            );
        }


        return this.buildResult({
            algorithm:
                PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL,

            frameCount:
                frames.length,

            referenceString:
                references,

            frames,

            steps,

            pageFaults,

            pageHits,

            replacements
        });
    }


    /*
     * =========================================================
     * SECOND CHANCE SIMULATION
     * =========================================================
     *
     * Reference bit:
     *
     *     0 → replace
     *     1 → clear and give second chance
     *
     * The queue is represented by a circular pointer.
     * =========================================================
     */

    simulateSecondChance(
        referenceString,
        frameCount
    ) {
        const references =
            normalizeReferenceString(
                referenceString
            );


        const validatedFrameCount =
            validateFrameCount(
                frameCount
            );


        const frames =
            Array(
                validatedFrameCount
            )
                .fill(null);


        const referenceBits =
            Array(
                validatedFrameCount
            )
                .fill(0);


        let pointer =
            0;


        const steps =
            [];


        let pageFaults =
            0;


        let pageHits =
            0;


        let replacements =
            0;


        for (
            let index = 0;
            index <
            references.length;
            index++
        ) {

            const page =
                references[index];


            const existingIndex =
                frames.indexOf(
                    page
                );


            let pageFault =
                false;


            let replacedPage =
                null;


            if (
                existingIndex !==
                -1
            ) {

                /*
                 * A hit sets the reference bit.
                 */

                pageHits++;


                referenceBits[
                    existingIndex
                ] =
                    1;

            } else {

                pageFaults++;


                pageFault =
                    true;


                /*
                 * First use an empty frame.
                 */

                const freeIndex =
                    frames.findIndex(
                        (
                            value
                        ) =>
                            value ===
                            null
                    );


                if (
                    freeIndex !==
                    -1
                ) {

                    frames[
                        freeIndex
                    ] =
                        page;


                    referenceBits[
                        freeIndex
                    ] =
                        1;


                    /*
                     * Keep the pointer moving naturally
                     * through the circular frame set.
                     */

                    pointer =
                        (
                            freeIndex + 1
                        ) %
                        validatedFrameCount;

                } else {

                    /*
                     * Search for a frame whose reference
                     * bit is zero.
                     */

                    while (
                        referenceBits[
                            pointer
                        ] ===
                        1
                    ) {

                        referenceBits[
                            pointer
                        ] =
                            0;


                        pointer =
                            (
                                pointer + 1
                            ) %
                            validatedFrameCount;
                    }


                    replacedPage =
                        frames[
                            pointer
                        ];


                    frames[
                        pointer
                    ] =
                        page;


                    referenceBits[
                        pointer
                    ] =
                        1;


                    pointer =
                        (
                            pointer + 1
                        ) %
                        validatedFrameCount;


                    replacements++;
                }
            }


            steps.push(
                createSimulationStep({
                    index,

                    referencedPage:
                        page,

                    frames,

                    pageFault,

                    pageHit:
                        !pageFault,

                    replacedPage,

                    algorithm:
                        PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE,

                    referenceBits,

                    pointer
                })
            );
        }


        return this.buildResult({
            algorithm:
                PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE,

            frameCount:
                validatedFrameCount,

            referenceString:
                references,

            frames,

            steps,

            pageFaults,

            pageHits,

            replacements,

            finalReferenceBits:
                referenceBits,

            finalPointer:
                pointer
        });
    }


    /*
     * =========================================================
     * CLOCK SIMULATION
     * =========================================================
     *
     * Clock is implemented using:
     *
     *     frames[]
     *     referenceBits[]
     *     clockHand
     *
     * The hand moves around the circular frame array.
     * =========================================================
     */

    simulateClock(
        referenceString,
        frameCount
    ) {
        const references =
            normalizeReferenceString(
                referenceString
            );


        const validatedFrameCount =
            validateFrameCount(
                frameCount
            );


        const frames =
            Array(
                validatedFrameCount
            )
                .fill(null);


        const referenceBits =
            Array(
                validatedFrameCount
            )
                .fill(0);


        let clockHand =
            0;


        const steps =
            [];


        let pageFaults =
            0;


        let pageHits =
            0;


        let replacements =
            0;


        for (
            let index = 0;
            index <
            references.length;
            index++
        ) {

            const page =
                references[index];


            const existingIndex =
                frames.indexOf(
                    page
                );


            let pageFault =
                false;


            let replacedPage =
                null;


            if (
                existingIndex !==
                -1
            ) {

                /*
                 * Referenced page gets reference bit = 1.
                 */

                pageHits++;


                referenceBits[
                    existingIndex
                ] =
                    1;

            } else {

                pageFaults++;


                pageFault =
                    true;


                /*
                 * First fill an empty frame.
                 */

                const freeIndex =
                    frames.findIndex(
                        (
                            value
                        ) =>
                            value ===
                            null
                    );


                if (
                    freeIndex !==
                    -1
                ) {

                    frames[
                        freeIndex
                    ] =
                        page;


                    referenceBits[
                        freeIndex
                    ] =
                        1;


                    clockHand =
                        (
                            freeIndex + 1
                        ) %
                        validatedFrameCount;

                } else {

                    /*
                     * Move the Clock hand until a frame with
                     * reference bit 0 is found.
                     */

                    while (
                        referenceBits[
                            clockHand
                        ] ===
                        1
                    ) {

                        referenceBits[
                            clockHand
                        ] =
                            0;


                        clockHand =
                            (
                                clockHand + 1
                            ) %
                            validatedFrameCount;
                    }


                    replacedPage =
                        frames[
                            clockHand
                        ];


                    frames[
                        clockHand
                    ] =
                        page;


                    referenceBits[
                        clockHand
                    ] =
                        1;


                    clockHand =
                        (
                            clockHand + 1
                        ) %
                        validatedFrameCount;


                    replacements++;
                }
            }


            steps.push(
                createSimulationStep({
                    index,

                    referencedPage:
                        page,

                    frames,

                    pageFault,

                    pageHit:
                        !pageFault,

                    replacedPage,

                    algorithm:
                        PAGE_REPLACEMENT_ALGORITHMS.CLOCK,

                    referenceBits,

                    pointer:
                        clockHand
                })
            );
        }


        return this.buildResult({
            algorithm:
                PAGE_REPLACEMENT_ALGORITHMS.CLOCK,

            frameCount:
                validatedFrameCount,

            referenceString:
                references,

            frames,

            steps,

            pageFaults,

            pageHits,

            replacements,

            finalReferenceBits:
                referenceBits,

            finalPointer:
                clockHand
        });
    }


    /*
     * =========================================================
     * RESULT BUILDER
     * =========================================================
     */

    buildResult({
        algorithm,
        frameCount,
        referenceString,
        frames,
        steps,
        pageFaults,
        pageHits,
        replacements,
        finalReferenceBits = null,
        finalPointer = null
    }) {

        const totalReferences =
            referenceString.length;


        const faultRatio =
            totalReferences > 0
                ? pageFaults /
                    totalReferences
                : 0;


        const hitRatio =
            totalReferences > 0
                ? pageHits /
                    totalReferences
                : 0;


        return {
            algorithm,

            frameCount,

            referenceString,

            frames,

            steps,

            pageFaults,

            pageHits,

            replacements,

            totalReferences,

            faultRatio,

            hitRatio,

            finalReferenceBits,

            finalPointer
        };
    }


    /*
     * =========================================================
     * GENERIC SIMULATION
     * =========================================================
     */

    simulate(
        referenceString,
        frameCount,
        {
            algorithm =
                this.defaultAlgorithm
        } = {}
    ) {
        const selectedAlgorithm =
            normalizeAlgorithm(
                algorithm
            );


        let result;


        switch (
            selectedAlgorithm
        ) {

            case PAGE_REPLACEMENT_ALGORITHMS.FIFO:

                result =
                    this.simulateFIFO(
                        referenceString,
                        frameCount
                    );

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.LRU:

                result =
                    this.simulateLRU(
                        referenceString,
                        frameCount
                    );

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL:

                result =
                    this.simulateOptimal(
                        referenceString,
                        frameCount
                    );

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE:

                result =
                    this.simulateSecondChance(
                        referenceString,
                        frameCount
                    );

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.CLOCK:

                result =
                    this.simulateClock(
                        referenceString,
                        frameCount
                    );

                break;


            default:

                throw new Error(
                    `Unsupported page replacement algorithm: ${selectedAlgorithm}`
                );
        }


        this.statistics.simulations++;


        this.statistics.totalReferences +=
            result.totalReferences;


        this.statistics.totalPageHits +=
            result.pageHits;


        this.statistics.totalPageFaults +=
            result.pageFaults;


        this.statistics.totalReplacements +=
            result.replacements;


        switch (
            selectedAlgorithm
        ) {

            case PAGE_REPLACEMENT_ALGORITHMS.FIFO:

                this.statistics.fifoSimulations++;

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.LRU:

                this.statistics.lruSimulations++;

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.OPTIMAL:

                this.statistics.optimalSimulations++;

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.SECOND_CHANCE:

                this.statistics.secondChanceSimulations++;

                break;


            case PAGE_REPLACEMENT_ALGORITHMS.CLOCK:

                this.statistics.clockSimulations++;

                break;
        }


        this.lastSimulation =
            result;


        this.emit(
            "simulation",
            result
        );


        return result;
    }


    /*
     * =========================================================
     * COMPARE ALL ALGORITHMS
     * =========================================================
     */

    compare(
        referenceString,
        frameCount
    ) {
        const references =
            normalizeReferenceString(
                referenceString
            );


        const frames =
            validateFrameCount(
                frameCount
            );


        const fifo =
            this.simulateFIFO(
                references,
                frames
            );


        const lru =
            this.simulateLRU(
                references,
                frames
            );


        const optimal =
            this.simulateOptimal(
                references,
                frames
            );


        const secondChance =
            this.simulateSecondChance(
                references,
                frames
            );


        const clock =
            this.simulateClock(
                references,
                frames
            );


        const algorithms = {
            fifo,

            lru,

            optimal,

            secondChance,

            clock
        };


        const results = [
            fifo,

            lru,

            optimal,

            secondChance,

            clock
        ];


        return {
            referenceString:
                references,

            frameCount:
                frames,

            algorithms,

            summary:
                results.map(
                    (result) => ({
                        algorithm:
                            result.algorithm,

                        pageFaults:
                            result.pageFaults,

                        pageHits:
                            result.pageHits,

                        replacements:
                            result.replacements,

                        faultRatio:
                            result.faultRatio,

                        hitRatio:
                            result.hitRatio
                    })
                )
        };
    }


    /*
     * =========================================================
     * STATISTICS
     * =========================================================
     */

    getStatistics() {
        return {
            ...this.statistics,

            defaultAlgorithm:
                this.defaultAlgorithm,

            supportedAlgorithms:
                this.getSupportedAlgorithms(),

            lastSimulation:
                this.lastSimulation
                    ? {
                        algorithm:
                            this.lastSimulation
                                .algorithm,

                        frameCount:
                            this.lastSimulation
                                .frameCount,

                        totalReferences:
                            this.lastSimulation
                                .totalReferences,

                        pageHits:
                            this.lastSimulation
                                .pageHits,

                        pageFaults:
                            this.lastSimulation
                                .pageFaults,

                        replacements:
                            this.lastSimulation
                                .replacements,

                        hitRatio:
                            this.lastSimulation
                                .hitRatio,

                        faultRatio:
                            this.lastSimulation
                                .faultRatio
                    }

                    : null
        };
    }


    getLastSimulation() {
        return this.lastSimulation;
    }


    getSnapshot() {
        return {
            defaultAlgorithm:
                this.defaultAlgorithm,

            clockHand:
                this.clockHand,

            statistics:
                this.getStatistics(),

            lastSimulation:
                this.lastSimulation
        };
    }


    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    reset() {
        this.statistics = {
            simulations: 0,

            totalReferences: 0,

            totalPageHits: 0,

            totalPageFaults: 0,

            totalReplacements: 0,

            fifoSimulations: 0,

            lruSimulations: 0,

            optimalSimulations: 0,

            secondChanceSimulations: 0,

            clockSimulations: 0
        };


        this.lastSimulation =
            null;


        this.clockHand =
            0;


        this.emit(
            "reset"
        );


        return this.getSnapshot();
    }
}


export default PageReplacementManager;