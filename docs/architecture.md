# NovaOS — System Architecture

## Overview

NovaOS is a client-server web application that simulates an operating system. The **frontend** (React) provides a desktop environment and system applications, while the **backend** (Express/Node.js) implements the actual OS algorithms and manages system state.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NOVAOS FRONTEND                         │
│                    (React + Vite)                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Desktop Shell│  │   Window     │  │  App Launcher    │   │
│  │ (Taskbar,    │  │   Manager    │  │  (Search, Grid,  │   │
│  │  Tray, Icons)│  │ (Drag, Resize│  │   Categories)    │   │
│  └──────────────┘  │  Min, Max)   │  └──────────────────┘   │
│                    └──────────────┘                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              System Applications (20)                │   │
│  │                                                      │   │
│  │  Scheduler · ProcessManager · MemoryManager          │   │
│  │  Paging · VirtualMemory · PageReplacement            │   │
│  │  Segmentation · Deadlock · Synchronization           │   │
│  │  ResourceMonitor · IOManager · FileExplorer          │   │
│  │  Terminal · SystemLogs · Browser · Notepad            │   │
│  │  Calculator · Camera · Gallery · Settings            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Aurora Design System (CSS Vars)            │   │
│  │     NovaTheme.css → Dark Mode / Light Mode            │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │  HTTP / REST API
                            │  (JSON over localhost:5000)
┌───────────────────────────▼─────────────────────────────────┐
│                     NOVAOS BACKEND                          │
│                  (Node.js + Express)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Express App (app.js)                │    │
│  │   CORS · JSON Parsing · Route Mounting              │    │
│  │   Health Check · 404/500 Error Handlers             │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │              API Routes (16 modules)                 │    │
│  │                                                      │    │
│  │  /api/scheduler    /api/processes    /api/memory     │    │
│  │  /api/paging       /api/segmentation /api/deadlock   │    │
│  │  /api/synchronization  /api/io       /api/filesystem │    │
│  │  /api/page-replacement /api/virtual-memory           │    │
│  │  /api/notifications    /api/auth     /api/system-logs│    │
│  │  /api/system           /api/applications             │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │               NovaOS Kernel                          │    │
│  │  (Singleton — manages all OS subsystems)             │    │
│  │                                                      │    │
│  │  ┌────────────┐ ┌─────────────┐ ┌───────────────┐   │    │
│  │  │ Process    │ │ Scheduler   │ │ Memory        │   │    │
│  │  │ Manager    │ │ + Algorithms│ │ Manager       │   │    │
│  │  │ (PCB,      │ │ (FCFS, SJF, │ │ (FirstFit,    │   │    │
│  │  │  Lifecycle)│ │  SRTF, RR,  │ │  BestFit,     │   │    │
│  │  │            │ │  Priority,  │ │  WorstFit)    │   │    │
│  │  │            │ │  Pre.Prior.)│ │               │   │    │
│  │  └────────────┘ └─────────────┘ └───────────────┘   │    │
│  │                                                      │    │
│  │  ┌────────────┐ ┌─────────────┐ ┌───────────────┐   │    │
│  │  │ Paging     │ │ Deadlock    │ │ Synchroniz.   │   │    │
│  │  │ Manager    │ │ Manager     │ │ Manager       │   │    │
│  │  │ (Page      │ │ (Banker's,  │ │ (Mutex,       │   │    │
│  │  │  Tables,   │ │  Detection, │ │  Semaphore)   │   │    │
│  │  │  TLB, Page │ │  Resource   │ │               │   │    │
│  │  │  Replace.) │ │  Graphs)    │ │               │   │    │
│  │  └────────────┘ └─────────────┘ └───────────────┘   │    │
│  │                                                      │    │
│  │  ┌────────────┐ ┌─────────────┐ ┌───────────────┐   │    │
│  │  │ Filesystem │ │ I/O Manager │ │ Device Manager│   │    │
│  │  │            │ │             │ │               │   │    │
│  │  └────────────┘ └─────────────┘ └───────────────┘   │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## CPU Scheduler Data Flow

```
User Input (Process Table)
        │
        ▼
┌─────────────────────┐
│  Scheduler.jsx      │
│  (Frontend)         │
│                     │
│  - Validates PIDs   │
│  - Sanitizes inputs │
│  - Sends POST to   │
│    /api/scheduler/  │
│    simulate         │
└─────────┬───────────┘
          │  POST { algorithm, timeQuantum, processes[] }
          ▼
┌─────────────────────┐
│ schedulerRoutes.js  │
│ (API Layer)         │
│                     │
│  - Input validation │
│  - Creates isolated │
│    ProcessManager   │
│  - Creates Scheduler│
│    with Algorithm   │
│  - Creates CPU +    │
│    Dispatcher       │
│  - Runs Simulation  │
│    Engine           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│ SimulationEngine.js │────►│ Algorithm Selection  │
│                     │     │                      │
│  - Tick-by-tick     │     │  FCFS.js             │
│    simulation loop  │     │  SJF.js              │
│  - Process arrival  │     │  SRTF.js             │
│    scheduling       │     │  RoundRobin.js       │
│  - Context switches │     │  Priority.js         │
│  - Timeline + Stats │     │  PreemptivePriority.js│
└─────────┬───────────┘     └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Response JSON      │
│                     │
│  - algorithm name   │
│  - timeline[]       │
│  - statistics{}     │
│  - averages{}       │
│  - processes[]      │
│    (with displayPid)│
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Scheduler.jsx      │
│  (Rendering)        │
│                     │
│  - Gantt Chart      │
│  - Metrics Grid     │
│  - Results Table    │
│  - Analysis Panel   │
│  - Observations     │
└─────────────────────┘
```

---

## Memory Management Architecture

```
┌───────────────────────────────────────────────┐
│            Memory Subsystem                    │
│                                                │
│  ┌──────────────────┐   ┌─────────────────┐   │
│  │  MemoryManager   │   │  PagingManager  │   │
│  │                  │   │                  │   │
│  │  Allocation:     │   │  Page Tables     │   │
│  │  - First Fit     │   │  Frame Alloc.    │   │
│  │  - Best Fit      │   │  TLB Simulation  │   │
│  │  - Worst Fit     │   │                  │   │
│  │                  │   │  Page Replace.:  │   │
│  │  Deallocation    │   │  - FIFO          │   │
│  │  Block Merging   │   │  - LRU           │   │
│  │  Fragmentation   │   │  - Optimal       │   │
│  │  Statistics      │   │  - Second Chance │   │
│  └──────────────────┘   │  - Clock         │   │
│                         └─────────────────┘   │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │          Segmentation Manager            │  │
│  │   Segment Tables · Protection · Sharing  │  │
│  └──────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

---

## Deadlock Subsystem

```
┌──────────────────────────────────────────┐
│          Deadlock Management              │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │     Banker's Algorithm           │    │
│  │                                  │    │
│  │  Available[] · Max[][] · Alloc[][]│   │
│  │  Need[][] = Max - Allocation     │    │
│  │  Safety Algorithm → Safe Sequence│    │
│  │  Request Evaluation              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │     Deadlock Detection           │    │
│  │                                  │    │
│  │  Resource Allocation Graph       │    │
│  │  Cycle Detection                 │    │
│  │  Deadlocked Process ID          │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## Theme Architecture

```
NovaTheme.css
    │
    ├── :root (Dark Mode — default)
    │   ├── --nova-bg-1       #0a0e1a
    │   ├── --nova-surface    #111827
    │   ├── --nova-text       #e2e8f0
    │   ├── --nova-accent     #38bdf8
    │   ├── --nova-border     rgba(...)
    │   └── ... (40+ tokens)
    │
    └── [data-theme="light"]
        ├── --nova-bg-1       #f1f5f9
        ├── --nova-surface    #ffffff
        ├── --nova-text       #1e293b
        ├── --nova-accent     #0284c7
        ├── --nova-border     rgba(...)
        └── ... (40+ tokens)

All 20 system apps consume these tokens via var(--nova-*)
```

---

## Test Coverage

| Subsystem        | Test File                        | Tests | Status |
|------------------|----------------------------------|-------|--------|
| Scheduler        | test-scheduler-correctness.js    | 7     | ✅ PASS |
| Scheduler        | test-all-algorithms.js           | 6     | ✅ PASS |
| Memory Manager   | test-memory-manager.js           | 9     | ✅ PASS |
| Deadlock         | test-deadlock.js                 | 14    | ✅ PASS |
| Synchronization  | test-synchronization.js          | 11    | ✅ PASS |
| **Total**        |                                  | **47**| ✅ ALL PASS |
