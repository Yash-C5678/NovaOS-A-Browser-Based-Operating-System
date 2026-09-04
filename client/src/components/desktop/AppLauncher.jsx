import { useMemo, useState } from "react";
import NovaIcon from "../ui/NovaIcon";

function getApplicationCategory(application) {
    const id =
        String(application?.id || "").toLowerCase();

    const name =
        String(application?.name || "").toLowerCase();

    if (
        id.includes("terminal") ||
        id.includes("file") ||
        id.includes("process") ||
        id.includes("memory") ||
        name.includes("terminal") ||
        name.includes("file") ||
        name.includes("process") ||
        name.includes("memory")
    ) {
        return "System";
    }

    if (
        id.includes("scheduler") ||
        id.includes("io") ||
        id.includes("synchronization") ||
        id.includes("deadlock")
    ) {
        return "OS Tools";
    }

    return "Applications";
}

function getCategoryIcon(category) {
    if (category === "System") {
        return "processes";
    }

    if (category === "OS Tools") {
        return "scheduler";
    }

    return "application";
}

function getApplicationAccent(application) {
    const id =
        String(application?.id || "").toLowerCase();

    const colors = {
        terminal: {
            main: "#4ade80",
            soft: "rgba(74, 222, 128, 0.13)",
            border: "rgba(74, 222, 128, 0.30)",
            glow: "rgba(74, 222, 128, 0.18)"
        },

        scheduler: {
            main: "#22d3ee",
            soft: "rgba(34, 211, 238, 0.13)",
            border: "rgba(34, 211, 238, 0.30)",
            glow: "rgba(34, 211, 238, 0.18)"
        },

        "process-manager": {
            main: "#3b82f6",
            soft: "rgba(59, 130, 246, 0.13)",
            border: "rgba(59, 130, 246, 0.30)",
            glow: "rgba(59, 130, 246, 0.18)"
        },

        "memory-manager": {
            main: "#a855f7",
            soft: "rgba(168, 85, 247, 0.13)",
            border: "rgba(168, 85, 247, 0.30)",
            glow: "rgba(168, 85, 247, 0.18)"
        },

        "io-manager": {
            main: "#f59e0b",
            soft: "rgba(245, 158, 11, 0.13)",
            border: "rgba(245, 158, 11, 0.30)",
            glow: "rgba(245, 158, 11, 0.18)"
        },

        synchronization: {
            main: "#14b8a6",
            soft: "rgba(20, 184, 166, 0.13)",
            border: "rgba(20, 184, 166, 0.30)",
            glow: "rgba(20, 184, 166, 0.18)"
        },

        deadlock: {
            main: "#fb7185",
            soft: "rgba(251, 113, 133, 0.13)",
            border: "rgba(251, 113, 133, 0.30)",
            glow: "rgba(251, 113, 133, 0.18)"
        },

        "file-explorer": {
            main: "#facc15",
            soft: "rgba(250, 204, 21, 0.13)",
            border: "rgba(250, 204, 21, 0.30)",
            glow: "rgba(250, 204, 21, 0.18)"
        },

        notepad: {
            main: "#38bdf8",
            soft: "rgba(56, 189, 248, 0.13)",
            border: "rgba(56, 189, 248, 0.30)",
            glow: "rgba(56, 189, 248, 0.18)"
        },

        calculator: {
            main: "#34d399",
            soft: "rgba(52, 211, 153, 0.13)",
            border: "rgba(52, 211, 153, 0.30)",
            glow: "rgba(52, 211, 153, 0.18)"
        },

        "resource-monitor": {
            main: "#84cc16",
            soft: "rgba(132, 204, 22, 0.13)",
            border: "rgba(132, 204, 22, 0.30)",
            glow: "rgba(132, 204, 22, 0.18)"
        },

        paging: {
            main: "#8b5cf6",
            soft: "rgba(139, 92, 246, 0.13)",
            border: "rgba(139, 92, 246, 0.30)",
            glow: "rgba(139, 92, 246, 0.18)"
        },

        segmentation: {
            main: "#fbbf24",
            soft: "rgba(251, 191, 36, 0.13)",
            border: "rgba(251, 191, 36, 0.30)",
            glow: "rgba(251, 191, 36, 0.18)"
        },

        "virtual-memory": {
            main: "#d946ef",
            soft: "rgba(217, 70, 239, 0.13)",
            border: "rgba(217, 70, 239, 0.30)",
            glow: "rgba(217, 70, 239, 0.18)"
        },

        "page-replacement": {
            main: "#ec4899",
            soft: "rgba(236, 72, 153, 0.13)",
            border: "rgba(236, 72, 153, 0.30)",
            glow: "rgba(236, 72, 153, 0.18)"
        },

        camera: {
            main: "#f472b6",
            soft: "rgba(244, 114, 182, 0.13)",
            border: "rgba(244, 114, 182, 0.30)",
            glow: "rgba(244, 114, 182, 0.18)"
        },

        gallery: {
            main: "#c084fc",
            soft: "rgba(192, 132, 252, 0.13)",
            border: "rgba(192, 132, 252, 0.30)",
            glow: "rgba(192, 132, 252, 0.18)"
        },

        settings: {
            main: "#818cf8",
            soft: "rgba(129, 140, 248, 0.13)",
            border: "rgba(129, 140, 248, 0.30)",
            glow: "rgba(129, 140, 248, 0.18)"
        },

        "system-logs": {
            main: "#fb923c",
            soft: "rgba(251, 146, 60, 0.13)",
            border: "rgba(251, 146, 60, 0.30)",
            glow: "rgba(251, 146, 60, 0.18)"
        },

        browser: {
            main: "#06b6d4",
            soft: "rgba(6, 182, 212, 0.13)",
            border: "rgba(6, 182, 212, 0.30)",
            glow: "rgba(6, 182, 212, 0.18)"
        }
    };

    return (
        colors[id] || {
            main: "#8b5cf6",
            soft: "rgba(139, 92, 246, 0.13)",
            border: "rgba(139, 92, 246, 0.30)",
            glow: "rgba(139, 92, 246, 0.18)"
        }
    );
}

function AppLauncher({
    applications = [],
    onLaunch,
    onClose
}) {
    const [launching, setLaunching] =
        useState(null);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [activeCategory, setActiveCategory] =
        useState("All");

    const handleLaunch = async (
        application
    ) => {
        if (
            !onLaunch ||
            launching
        ) {
            return;
        }

        try {
            setLaunching(
                application.id
            );

            await onLaunch(
                application
            );

            onClose?.();
        } finally {
            setLaunching(null);
        }
    };

    const categories =
        useMemo(() => {
            const values =
                new Set(
                    applications.map(
                        getApplicationCategory
                    )
                );

            return [
                "All",
                ...Array.from(values)
                    .sort()
            ];
        }, [applications]);

    const filteredApplications =
        useMemo(() => {
            const query =
                searchQuery
                    .trim()
                    .toLowerCase();

            return applications.filter(
                (application) => {
                    const category =
                        getApplicationCategory(
                            application
                        );

                    if (
                        activeCategory !==
                        "All" &&
                        category !==
                        activeCategory
                    ) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    const name =
                        String(
                            application.name ||
                            ""
                        ).toLowerCase();

                    const description =
                        String(
                            application.description ||
                            ""
                        ).toLowerCase();

                    return (
                        name.includes(query) ||
                        description.includes(query)
                    );
                }
            );
        }, [
            applications,
            searchQuery,
            activeCategory
        ]);

    const groupedApplications =
        useMemo(() => {
            const groups = {};

            for (
                const application
                of filteredApplications
            ) {
                const category =
                    getApplicationCategory(
                        application
                    );

                if (!groups[category]) {
                    groups[category] = [];
                }

                groups[category].push(
                    application
                );
            }

            return groups;
        }, [filteredApplications]);

    const categoryOrder = [
        "System",
        "OS Tools",
        "Applications"
    ];

    return (
        <>
            <style>
                {`
                    .nova-app-center-overlay {
                        position: fixed !important;
                        inset: 0 !important;
                        z-index: 10000 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        padding: 24px !important;
                        box-sizing: border-box !important;
                        background: rgba(2, 7, 16, 0.68) !important;
                        backdrop-filter: blur(8px) !important;
                    }

                    .nova-app-center {
                        width: min(980px, calc(100vw - 48px)) !important;
                        max-width: 980px !important;
                        height: min(760px, calc(100vh - 48px)) !important;
                        max-height: calc(100vh - 48px) !important;
                        min-height: 420px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                        box-sizing: border-box !important;
                        border: 1px solid rgba(105, 150, 205, 0.28) !important;
                        border-radius: 18px !important;
                        background:
                            linear-gradient(
                                145deg,
                                rgba(11, 21, 36, 0.98),
                                rgba(7, 14, 26, 0.98)
                            ) !important;
                        box-shadow:
                            0 30px 90px rgba(0, 0, 0, 0.55),
                            0 0 0 1px rgba(255, 255, 255, 0.025) inset !important;
                        color: #e7eef8 !important;
                    }

                    .nova-app-center-header {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        gap: 20px !important;
                        padding: 22px 24px 18px !important;
                        border-bottom: 1px solid rgba(120, 150, 190, 0.14) !important;
                    }

                    .nova-app-center-heading {
                        display: flex !important;
                        align-items: center !important;
                        gap: 14px !important;
                        min-width: 0 !important;
                    }

                    .nova-app-center-heading-icon {
                        width: 44px !important;
                        height: 44px !important;
                        flex: 0 0 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 12px !important;
                        background: linear-gradient(
                            135deg,
                            #3c9be8,
                            #6554d9
                        ) !important;
                        box-shadow: 0 8px 22px rgba(65, 115, 220, 0.25) !important;
                    }

                    .nova-app-center-title {
                        margin: 0 !important;
                        font-size: 21px !important;
                        line-height: 1.2 !important;
                        font-weight: 700 !important;
                        letter-spacing: -0.3px !important;
                    }

                    .nova-app-center-subtitle {
                        margin-top: 5px !important;
                        color: #71839b !important;
                        font-size: 12px !important;
                    }

                    .nova-app-center-close {
                        width: 36px !important;
                        height: 36px !important;
                        flex: 0 0 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border: 1px solid rgba(120, 150, 190, 0.2) !important;
                        border-radius: 9px !important;
                        background: rgba(255, 255, 255, 0.025) !important;
                        color: #91a2b8 !important;
                        font-size: 22px !important;
                        line-height: 1 !important;
                        cursor: pointer !important;
                        transition:
                            background 0.15s ease,
                            color 0.15s ease,
                            border-color 0.15s ease !important;
                    }

                    .nova-app-center-close:hover {
                        background: rgba(255, 255, 255, 0.08) !important;
                        color: #ffffff !important;
                        border-color: rgba(120, 170, 230, 0.35) !important;
                    }

                    .nova-app-center-toolbar {
                        flex: 0 0 auto !important;
                        padding: 16px 24px 12px !important;
                    }

                    .nova-app-center-search {
                        width: 100% !important;
                        height: 42px !important;
                        display: flex !important;
                        align-items: center !important;
                        gap: 10px !important;
                        padding: 0 13px !important;
                        box-sizing: border-box !important;
                        border: 1px solid rgba(110, 145, 185, 0.2) !important;
                        border-radius: 10px !important;
                        background: rgba(2, 8, 17, 0.58) !important;
                        color: #71839b !important;
                    }

                    .nova-app-center-search:focus-within {
                        border-color: rgba(74, 155, 235, 0.5) !important;
                        box-shadow: 0 0 0 3px rgba(60, 145, 225, 0.08) !important;
                    }

                    .nova-app-center-search input {
                        flex: 1 !important;
                        min-width: 0 !important;
                        height: 100% !important;
                        padding: 0 !important;
                        border: 0 !important;
                        outline: 0 !important;
                        background: transparent !important;
                        color: #e7eef8 !important;
                        font: inherit !important;
                        font-size: 13px !important;
                    }

                    .nova-app-center-search input::placeholder {
                        color: #596b83 !important;
                    }

                    .nova-app-center-search-clear {
                        width: 24px !important;
                        height: 24px !important;
                        border: 0 !important;
                        background: transparent !important;
                        color: #71839b !important;
                        cursor: pointer !important;
                        font-size: 18px !important;
                    }

                    .nova-app-center-categories {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        gap: 8px !important;
                        padding: 0 24px 14px !important;
                        overflow-x: auto !important;
                        scrollbar-width: thin !important;
                    }

                    .nova-app-center-category {
                        height: 34px !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        gap: 7px !important;
                        padding: 0 12px !important;
                        flex: 0 0 auto !important;
                        border: 1px solid rgba(110, 145, 185, 0.18) !important;
                        border-radius: 8px !important;
                        background: rgba(255, 255, 255, 0.025) !important;
                        color: #8293a9 !important;
                        font-size: 12px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        transition:
                            background 0.15s ease,
                            border-color 0.15s ease,
                            color 0.15s ease !important;
                    }

                    .nova-app-center-category:hover {
                        color: #dbe7f5 !important;
                        background: rgba(255, 255, 255, 0.055) !important;
                    }

                    .nova-app-center-category.active {
                        color: #ffffff !important;
                        border-color: rgba(72, 151, 229, 0.45) !important;
                        background: rgba(56, 125, 204, 0.16) !important;
                    }

                    .nova-app-center-category-count {
                        min-width: 18px !important;
                        height: 18px !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 5px !important;
                        background: rgba(255, 255, 255, 0.07) !important;
                        font-size: 10px !important;
                        font-weight: 700 !important;
                    }

                    .nova-app-center-content {
                        flex: 1 1 auto !important;
                        min-height: 0 !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        padding: 0 24px 20px !important;
                        scrollbar-width: thin !important;
                        scrollbar-color: rgba(100, 135, 175, 0.35) transparent !important;
                    }

                    .nova-app-center-content::-webkit-scrollbar {
                        width: 7px !important;
                    }

                    .nova-app-center-content::-webkit-scrollbar-track {
                        background: transparent !important;
                    }

                    .nova-app-center-content::-webkit-scrollbar-thumb {
                        border-radius: 10px !important;
                        background: rgba(100, 135, 175, 0.35) !important;
                    }

                    .nova-app-center-group {
                        margin-bottom: 24px !important;
                    }

                    .nova-app-center-group:last-child {
                        margin-bottom: 0 !important;
                    }

                    .nova-app-center-group-header {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        margin-bottom: 10px !important;
                    }

                    .nova-app-center-group-title {
                        display: flex !important;
                        align-items: center !important;
                        gap: 8px !important;
                        color: #aebed1 !important;
                        font-size: 12px !important;
                        letter-spacing: 0.5px !important;
                        text-transform: uppercase !important;
                    }

                    .nova-app-center-group-title-icon {
                        width: 26px !important;
                        height: 26px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 7px !important;
                        background: rgba(255, 255, 255, 0.045) !important;
                        color: #6ea9df !important;
                    }

                    .nova-app-center-group-count {
                        color: #52657d !important;
                        font-size: 10px !important;
                    }

                    .nova-app-center-grid {
                        display: grid !important;
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                        gap: 10px !important;
                    }

                    .nova-app-center-card {
                        position: relative !important;
                        min-width: 0 !important;
                        min-height: 148px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        padding: 15px !important;
                        box-sizing: border-box !important;
                        border: 1px solid rgba(105, 140, 180, 0.17) !important;
                        border-radius: 12px !important;
                        background: rgba(11, 22, 37, 0.7) !important;
                        color: #dce7f4 !important;
                        text-align: left !important;
                        cursor: pointer !important;
                        transition:
                            transform 0.15s ease,
                            border-color 0.15s ease,
                            background 0.15s ease,
                            box-shadow 0.15s ease !important;
                    }

                    .nova-app-center-card:hover {
                        transform: translateY(-2px) !important;
                        border-color: var(--nova-app-accent-border) !important;
                        background: rgba(18, 34, 55, 0.9) !important;
                        box-shadow:
                            0 10px 28px rgba(0, 0, 0, 0.22),
                            0 0 24px var(--nova-app-accent-glow) !important;
                    }

                    .nova-app-center-card:disabled {
                        cursor: default !important;
                        opacity: 0.65 !important;
                    }

                    .nova-app-center-card.launching {
                        border-color: var(--nova-app-accent-border) !important;
                        box-shadow:
                            0 0 0 1px var(--nova-app-accent-border),
                            0 0 24px var(--nova-app-accent-glow) !important;
                    }

                    .nova-app-center-card-top {
                        display: flex !important;
                        align-items: flex-start !important;
                        justify-content: space-between !important;
                        gap: 8px !important;
                    }

                    .nova-app-center-card-icon {
                        width: 46px !important;
                        height: 46px !important;
                        flex: 0 0 46px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border: 1px solid var(--nova-app-accent-border) !important;
                        border-radius: 12px !important;
                        background:
                            linear-gradient(
                                145deg,
                                var(--nova-app-accent-soft),
                                rgba(255, 255, 255, 0.025)
                            ) !important;
                        color: var(--nova-app-accent) !important;
                        box-shadow:
                            0 7px 18px rgba(0, 0, 0, 0.16),
                            0 0 20px var(--nova-app-accent-glow) !important;
                        transition:
                            transform 0.15s ease,
                            background 0.15s ease,
                            box-shadow 0.15s ease !important;
                    }

                    .nova-app-center-card:hover .nova-app-center-card-icon {
                        transform: translateY(-1px) scale(1.03) !important;
                        background:
                            linear-gradient(
                                145deg,
                                var(--nova-app-accent-soft),
                                rgba(255, 255, 255, 0.045)
                            ) !important;
                        box-shadow:
                            0 8px 20px rgba(0, 0, 0, 0.18),
                            0 0 26px var(--nova-app-accent-glow) !important;
                    }

                    .nova-app-center-card-status {
                        padding: 4px 7px !important;
                        border-radius: 5px !important;
                        background: var(--nova-app-accent-soft) !important;
                        color: var(--nova-app-accent) !important;
                        border: 1px solid var(--nova-app-accent-border) !important;
                        font-size: 9px !important;
                        font-weight: 700 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.4px !important;
                    }

                    .nova-app-center-card-info {
                        min-width: 0 !important;
                        margin-top: 12px !important;
                    }

                    .nova-app-center-card-name {
                        display: block !important;
                        overflow: hidden !important;
                        color: #e4edf7 !important;
                        font-size: 13px !important;
                        font-weight: 700 !important;
                        line-height: 1.3 !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                    }

                    .nova-app-center-card-description {
                        display: -webkit-box !important;
                        margin-top: 5px !important;
                        overflow: hidden !important;
                        color: #667990 !important;
                        font-size: 10px !important;
                        line-height: 1.45 !important;
                        -webkit-line-clamp: 2 !important;
                        -webkit-box-orient: vertical !important;
                    }

                    .nova-app-center-card-footer {
                        margin-top: auto !important;
                        padding-top: 12px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        color: #5e7691 !important;
                        font-size: 10px !important;
                        font-weight: 600 !important;
                    }

                    .nova-app-center-card-footer svg {
                        color: var(--nova-app-accent) !important;
                        opacity: 0.8 !important;
                    }

                    .nova-app-center-empty {
                        min-height: 300px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        text-align: center !important;
                        color: #6e8199 !important;
                    }

                    .nova-app-center-empty-icon {
                        width: 62px !important;
                        height: 62px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        margin-bottom: 14px !important;
                        border-radius: 16px !important;
                        background: rgba(70, 130, 200, 0.1) !important;
                        color: #639dd0 !important;
                    }

                    .nova-app-center-empty h3 {
                        margin: 0 !important;
                        color: #dbe6f2 !important;
                        font-size: 15px !important;
                    }

                    .nova-app-center-empty p {
                        max-width: 360px !important;
                        margin: 7px 0 0 !important;
                        color: #62758d !important;
                        font-size: 11px !important;
                        line-height: 1.5 !important;
                    }

                    .nova-app-center-reset {
                        margin-top: 14px !important;
                        padding: 8px 13px !important;
                        border: 1px solid rgba(90, 145, 205, 0.25) !important;
                        border-radius: 7px !important;
                        background: rgba(70, 135, 205, 0.1) !important;
                        color: #72afe0 !important;
                        cursor: pointer !important;
                    }

                    .nova-app-center-footer {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        gap: 15px !important;
                        padding: 11px 24px !important;
                        border-top: 1px solid rgba(120, 150, 190, 0.12) !important;
                        color: #566b83 !important;
                        font-size: 10px !important;
                    }

                    .nova-app-center-footer-info {
                        display: flex !important;
                        align-items: center !important;
                        gap: 7px !important;
                    }

                    .nova-app-center-footer-dot {
                        width: 6px !important;
                        height: 6px !important;
                        border-radius: 50% !important;
                        background: #52c99b !important;
                        box-shadow: 0 0 8px rgba(82, 201, 155, 0.5) !important;
                    }

                    @media (max-width: 850px) {
                        .nova-app-center-grid {
                            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                        }
                    }

                    @media (max-width: 650px) {
                        .nova-app-center-overlay {
                            padding: 12px !important;
                        }

                        .nova-app-center {
                            width: calc(100vw - 24px) !important;
                            height: calc(100vh - 24px) !important;
                            max-height: calc(100vh - 24px) !important;
                            border-radius: 14px !important;
                        }

                        .nova-app-center-grid {
                            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        }

                        .nova-app-center-header,
                        .nova-app-center-toolbar,
                        .nova-app-center-categories,
                        .nova-app-center-content {
                            padding-left: 15px !important;
                            padding-right: 15px !important;
                        }

                        .nova-app-center-footer {
                            padding-left: 15px !important;
                            padding-right: 15px !important;
                        }

                        .nova-app-center-footer-hint {
                            display: none !important;
                        }
                    }

                    @media (max-width: 430px) {
                        .nova-app-center-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }
                `}
            </style>

            <div
                className="nova-app-center-overlay"
                onMouseDown={(event) => {
                    if (
                        event.target ===
                        event.currentTarget
                    ) {
                        onClose?.();
                    }
                }}
            >
                <div className="nova-app-center">

                    <div className="nova-app-center-header">

                        <div className="nova-app-center-heading">

                            <div className="nova-app-center-heading-icon">
                                <NovaIcon
                                    name="application"
                                    size={23}
                                />
                            </div>

                            <div>
                                <div className="nova-app-center-title">
                                    Applications
                                </div>

                                <div className="nova-app-center-subtitle">
                                    Browse and launch NovaOS applications
                                </div>
                            </div>

                        </div>

                        <button
                            type="button"
                            className="nova-app-center-close"
                            onClick={onClose}
                            aria-label="Close applications"
                        >
                            ×
                        </button>

                    </div>

                    <div className="nova-app-center-toolbar">

                        <div className="nova-app-center-search">

                            <NovaIcon
                                name="application"
                                size={16}
                            />

                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(
                                        event.target.value
                                    )
                                }
                                placeholder="Search applications..."
                                aria-label="Search applications"
                            />

                            {searchQuery && (
                                <button
                                    type="button"
                                    className="nova-app-center-search-clear"
                                    onClick={() =>
                                        setSearchQuery("")
                                    }
                                >
                                    ×
                                </button>
                            )}

                        </div>

                    </div>

                    <div className="nova-app-center-categories">

                        {categories.map(
                            (category) => (
                                <button
                                    type="button"
                                    key={category}
                                    className={
                                        activeCategory ===
                                            category
                                            ? "nova-app-center-category active"
                                            : "nova-app-center-category"
                                    }
                                    onClick={() =>
                                        setActiveCategory(
                                            category
                                        )
                                    }
                                >
                                    {category !==
                                        "All" && (
                                            <NovaIcon
                                                name={getCategoryIcon(
                                                    category
                                                )}
                                                size={14}
                                            />
                                        )}

                                    <span>
                                        {category}
                                    </span>

                                    <span className="nova-app-center-category-count">
                                        {
                                            applications.filter(
                                                (
                                                    application
                                                ) =>
                                                    category ===
                                                    "All" ||
                                                    getApplicationCategory(
                                                        application
                                                    ) ===
                                                    category
                                            ).length
                                        }
                                    </span>
                                </button>
                            )
                        )}

                    </div>

                    <div className="nova-app-center-content">

                        {applications.length ===
                            0 ? (
                            <div className="nova-app-center-empty">

                                <div className="nova-app-center-empty-icon">
                                    <NovaIcon
                                        name="application"
                                        size={32}
                                    />
                                </div>

                                <h3>
                                    No applications
                                </h3>

                                <p>
                                    No NovaOS applications
                                    are currently registered.
                                </p>

                            </div>
                        ) : filteredApplications.length ===
                            0 ? (
                            <div className="nova-app-center-empty">

                                <div className="nova-app-center-empty-icon">
                                    <NovaIcon
                                        name="application"
                                        size={32}
                                    />
                                </div>

                                <h3>
                                    No matching applications
                                </h3>

                                <p>
                                    Try another search or
                                    select a different category.
                                </p>

                                <button
                                    type="button"
                                    className="nova-app-center-reset"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setActiveCategory(
                                            "All"
                                        );
                                    }}
                                >
                                    Clear filters
                                </button>

                            </div>
                        ) : (
                            <div>

                                {categoryOrder.map(
                                    (category) => {
                                        const categoryApplications =
                                            groupedApplications[
                                            category
                                            ];

                                        if (
                                            !categoryApplications ||
                                            categoryApplications.length ===
                                            0
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <section
                                                key={
                                                    category
                                                }
                                                className="nova-app-center-group"
                                            >

                                                <div className="nova-app-center-group-header">

                                                    <div className="nova-app-center-group-title">

                                                        <span className="nova-app-center-group-title-icon">
                                                            <NovaIcon
                                                                name={getCategoryIcon(
                                                                    category
                                                                )}
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                        </span>

                                                        <strong>
                                                            {
                                                                category
                                                            }
                                                        </strong>

                                                    </div>

                                                    <span className="nova-app-center-group-count">
                                                        {
                                                            categoryApplications.length
                                                        }{" "}
                                                        app
                                                        {categoryApplications.length ===
                                                            1
                                                            ? ""
                                                            : "s"}
                                                    </span>

                                                </div>

                                                <div className="nova-app-center-grid">

                                                    {categoryApplications.map(
                                                        (
                                                            application
                                                        ) => {
                                                            const isLaunching =
                                                                launching ===
                                                                application.id;

                                                            const accent =
                                                                getApplicationAccent(
                                                                    application
                                                                );

                                                            const accentStyle = {
                                                                "--nova-app-accent":
                                                                    accent.main,
                                                                "--nova-app-accent-soft":
                                                                    accent.soft,
                                                                "--nova-app-accent-border":
                                                                    accent.border,
                                                                "--nova-app-accent-glow":
                                                                    accent.glow
                                                            };

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={
                                                                        application.id
                                                                    }
                                                                    className={`nova-app-center-card ${isLaunching
                                                                            ? "launching"
                                                                            : ""
                                                                        }`}
                                                                    style={
                                                                        accentStyle
                                                                    }
                                                                    disabled={
                                                                        launching !==
                                                                        null
                                                                    }
                                                                    onClick={() =>
                                                                        handleLaunch(
                                                                            application
                                                                        )
                                                                    }
                                                                >

                                                                    <div className="nova-app-center-card-top">

                                                                        <div className="nova-app-center-card-icon">
                                                                            <NovaIcon
                                                                                name={
                                                                                    application.icon ||
                                                                                    "application"
                                                                                }
                                                                                size={
                                                                                    25
                                                                                }
                                                                            />
                                                                        </div>

                                                                        {isLaunching && (
                                                                            <span className="nova-app-center-card-status">
                                                                                Launching
                                                                            </span>
                                                                        )}

                                                                    </div>

                                                                    <div className="nova-app-center-card-info">

                                                                        <span className="nova-app-center-card-name">
                                                                            {
                                                                                application.name
                                                                            }
                                                                        </span>

                                                                        <span className="nova-app-center-card-description">
                                                                            {
                                                                                application.description ||
                                                                                "NovaOS application"
                                                                            }
                                                                        </span>

                                                                    </div>

                                                                    <div className="nova-app-center-card-footer">

                                                                        <span>
                                                                            Open
                                                                        </span>

                                                                        <NovaIcon
                                                                            name="chevron-right"
                                                                            size={
                                                                                14
                                                                            }
                                                                        />

                                                                    </div>

                                                                </button>
                                                            );
                                                        }
                                                    )}

                                                </div>

                                            </section>
                                        );
                                    }
                                )}

                            </div>
                        )}

                    </div>

                    <div className="nova-app-center-footer">

                        <div className="nova-app-center-footer-info">

                            <span className="nova-app-center-footer-dot" />

                            <span>
                                {applications.length}{" "}
                                application
                                {applications.length ===
                                    1
                                    ? ""
                                    : "s"}{" "}
                                available
                            </span>

                        </div>

                        <div className="nova-app-center-footer-hint">
                            Click an application to launch
                        </div>

                    </div>

                </div>
            </div>
        </>
    );
}

export default AppLauncher;