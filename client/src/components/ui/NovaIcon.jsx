function NovaIcon({
    name,
    size = 18,
    strokeWidth = 1.8,
    className = ""
}) {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        "aria-hidden": "true"
    };

    switch (name) {
        case "overview":
            return (
                <svg {...common}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
            );

        case "process":
        case "processes":
            return (
                <svg {...common}>
                    <rect x="9" y="3" width="6" height="5" rx="1" />
                    <rect x="3" y="16" width="6" height="5" rx="1" />
                    <rect x="15" y="16" width="6" height="5" rx="1" />
                    <path d="M12 8v4M6 12h12M6 12v4M18 12v4" />
                </svg>
            );

        case "memory":
            return (
                <svg {...common}>
                    <rect x="3" y="7" width="18" height="10" rx="2" />
                    <path d="M7 7v10M11 7v10M15 7v10M19 7v10" />
                    <path d="M5 4v3M9 4v3M13 4v3M17 4v3M5 17v3M9 17v3M13 17v3M17 17v3" />
                </svg>
            );

        case "io":
            return (
                <svg {...common}>
                    <path d="M5 8h13" />
                    <path d="m15 5 3 3-3 3" />
                    <path d="M19 16H6" />
                    <path d="m9 13-3 3 3 3" />
                </svg>
            );

        case "synchronization":
        case "sync":
            return (
                <svg {...common}>
                    <path d="M20 7a8 8 0 0 0-14.5-2L4 7" />
                    <path d="M4 4v3h3" />
                    <path d="M4 17a8 8 0 0 0 14.5 2L20 17" />
                    <path d="M20 20v-3h-3" />
                </svg>
            );

        case "deadlock":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M9 9l6 6M15 9l-6 6" />
                </svg>
            );

        case "terminal":
            return (
                <svg {...common}>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="m7 9 3 3-3 3M13 15h4" />
                </svg>
            );

        case "scheduler":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7v5l3 2" />
                    <path d="M7 3.8 5.5 2.5M17 3.8l1.5-1.3" />
                </svg>
            );

        case "cpu":
            return (
                <svg {...common}>
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                    <path d="M9 2v4M12 2v4M15 2v4M9 18v4M12 18v4M15 18v4" />
                    <path d="M2 9h4M2 12h4M2 15h4M18 9h4M18 12h4M18 15h4" />
                </svg>
            );

        case "paging":
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="6" height="7" rx="1" />
                    <rect x="14" y="3" width="6" height="7" rx="1" />
                    <rect x="4" y="14" width="6" height="7" rx="1" />
                    <rect x="14" y="14" width="6" height="7" rx="1" />
                    <path d="M10 6.5h4M7 10v4M17 10v4M10 17.5h4" />
                </svg>
            );

        case "segmentation":
            return (
                <svg {...common}>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M4 10h16M10 4v16" />
                    <path d="M14 14h3M14 17h3" />
                </svg>
            );

        case "virtual-memory":
        case "virtualmemory":
            return (
                <svg {...common}>
                    <rect x="3" y="5" width="11" height="9" rx="1.5" />
                    <path d="M6 5v9M10 5v9" />
                    <path d="M5 3v2M9 3v2M13 3v2M5 14v2M9 14v2M13 14v2" />
                    <path d="M14 17h7v4h-7z" />
                    <path d="M16 17v-2h3v2M17 19h1" />
                    <path d="M14 18.5h-2" />
                </svg>
            );

        case "page-replacement":
        case "pagereplacement":
            return (
                <svg {...common}>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M8 9h8M8 12h5M8 15h8" />
                    <path d="M17 3l2 2-2 2" />
                    <path d="M7 21l-2-2 2-2" />
                </svg>
            );

        case "io-manager":
            return (
                <svg {...common}>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 8h8M8 12h5M8 16h8" />
                    <path d="M17 10v4M15 12h4" />
                </svg>
            );

        case "file":
        case "filesystem":
        case "file-system":
            return (
                <svg {...common}>
                    <path d="M4 5a2 2 0 0 1 2-2h6l3 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                    <path d="M4 8h16" />
                </svg>
            );

        case "file-explorer":
        case "explorer":
            return (
                <svg {...common}>
                    <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <path d="M3 9h18" />
                    <path d="M8 13h4M8 16h7" />
                </svg>
            );

        case "notepad":
        case "note":
            return (
                <svg {...common}>
                    <path d="M6 3h9l3 3v15H6z" />
                    <path d="M15 3v4h4" />
                    <path d="M9 11h6M9 14h6M9 17h4" />
                </svg>
            );

        case "calculator":
        case "calc":
            return (
                <svg {...common}>
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <path d="M8 7h8" />
                    <circle cx="9" cy="12" r=".7" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="12" r=".7" fill="currentColor" stroke="none" />
                    <circle cx="9" cy="16" r=".7" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="16" r=".7" fill="currentColor" stroke="none" />
                    <path d="M15 15v3M13.5 16.5h3" />
                </svg>
            );

        case "resource-monitor":
        case "monitor":
            return (
                <svg {...common}>
                    <rect x="3" y="4" width="18" height="13" rx="2" />
                    <path d="M7 14l3-4 3 2 4-5" />
                    <path d="M9 21h6M12 17v4" />
                </svg>
            );

        case "browser":
        case "web":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9" />
                    <path d="M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9" />
                </svg>
            );

        case "network":
            return (
                <svg {...common}>
                    <circle cx="12" cy="5" r="2.5" />
                    <circle cx="6" cy="18" r="2.5" />
                    <circle cx="18" cy="18" r="2.5" />
                    <path d="M10.5 7.2 7.5 15.8M13.5 7.2l3 8.6M8.5 18h7" />
                </svg>
            );

        case "camera":
            return (
                <svg {...common}>
                    <path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                    <circle cx="12" cy="13.5" r="3.5" />
                </svg>
            );

        case "gallery":
        case "photos":
            return (
                <svg {...common}>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="8.5" cy="9" r="1.5" />
                    <path d="m4 17 5-5 3 3 2-2 6 5" />
                </svg>
            );

        case "settings":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10.3a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.3V14h-.3a1.7 1.7 0 0 0-1.6 1Z" />
                </svg>
            );

        case "system-logs":
        case "logs":
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="M8 7h8M8 11h8M8 15h5M8 18h7" />
                </svg>
            );

        case "user":
        case "profile":
            return (
                <svg {...common}>
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
                </svg>
            );

        case "power":
        case "shutdown":
            return (
                <svg {...common}>
                    <path d="M12 3v9" />
                    <path d="M7.5 5.8a8 8 0 1 0 9 0" />
                </svg>
            );

        case "close":
            return (
                <svg {...common}>
                    <path d="m7 7 10 10M17 7 7 17" />
                </svg>
            );

        case "minimize":
            return (
                <svg {...common}>
                    <path d="M5 12h14" />
                </svg>
            );

        case "maximize":
            return (
                <svg {...common}>
                    <rect x="5" y="5" width="14" height="14" rx="1" />
                </svg>
            );

        case "restore":
            return (
                <svg {...common}>
                    <path d="M8 8h11v11H8z" />
                    <path d="M5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
                </svg>
            );

        case "search":
            return (
                <svg {...common}>
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m16 16 5 5" />
                </svg>
            );

        case "refresh":
            return (
                <svg {...common}>
                    <path d="M20 11a8 8 0 0 0-14.7-4L3 10" />
                    <path d="M3 5v5h5" />
                    <path d="M4 13a8 8 0 0 0 14.7 4L21 14" />
                    <path d="M21 19v-5h-5" />
                </svg>
            );

        case "check":
            return (
                <svg {...common}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case "warning":
        case "alert":
            return (
                <svg {...common}>
                    <path d="M12 4 3 20h18L12 4Z" />
                    <path d="M12 10v4M12 17h.01" />
                </svg>
            );

        case "default":
        case "unknown":
        default:
            return (
                <svg {...common}>
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <path d="M8 8h8v8H8z" />
                </svg>
            );
    }
}

export default NovaIcon;