# NovaOS Architecture Diagrams

## 1. System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        DS[Desktop Shell]
        WM[Window Manager]
        AL[App Launcher]
        Apps[System Apps x20]
        Theme[Aurora Design System]
    end

    subgraph Backend["Backend (Node.js + Express)"]
        API[Express API Layer]
        Routes[16 Route Modules]
        Kernel[NovaOS Kernel]

        subgraph OS["OS Subsystems"]
            PM[Process Manager]
            SCH[Scheduler]
            MM[Memory Manager]
            PG[Paging Manager]
            DL[Deadlock Manager]
            SY[Synchronization]
            FS[Filesystem]
            IO[I/O Manager]
        end
    end

    Frontend -->|HTTP REST API| Backend
    API --> Routes
    Routes --> Kernel
    Kernel --> OS
```

## 2. CPU Scheduler Flow

```mermaid
flowchart TD
    A[User Configures Processes] --> B[Select Algorithm]
    B --> C{Round Robin?}
    C -->|Yes| D[Set Time Quantum]
    C -->|No| E[Click Run]
    D --> E
    E --> F[Validate Inputs]
    F -->|Invalid| G[Show Error]
    F -->|Valid| H["POST /api/scheduler/simulate"]
    H --> I[Create Isolated ProcessManager]
    I --> J[Instantiate Algorithm]
    J --> K[Build SimulationEngine]
    K --> L[Run Tick-by-Tick Simulation]
    L --> M[Compute Metrics]
    M --> N[Return JSON Response]
    N --> O[Render Gantt Chart]
    N --> P[Render Metrics Grid]
    N --> Q[Render Results Table]
    N --> R[Render Analysis Panel]
```

## 3. Scheduling Algorithm Selection

```mermaid
flowchart LR
    Input[Algorithm ID] --> Factory[createAlgorithm]
    Factory --> FCFS[FCFS]
    Factory --> SJF[SJF]
    Factory --> SRTF[SRTF]
    Factory --> RR["Round Robin (quantum)"]
    Factory --> PRI[Priority]
    Factory --> PP[Preemptive Priority]
```

## 4. Process State Diagram

```mermaid
stateDiagram-v2
    [*] --> New: Process Created
    New --> Ready: Admitted
    Ready --> Running: Dispatched
    Running --> Ready: Preempted / Quantum Expired
    Running --> Waiting: I/O Request
    Waiting --> Ready: I/O Complete
    Running --> Terminated: Execution Complete
    Terminated --> [*]
```

## 5. Memory Management Hierarchy

```mermaid
graph TD
    subgraph Memory["Memory Subsystem"]
        MM[Memory Manager]
        PM[Paging Manager]
        SM[Segmentation Manager]
        PR[Page Replacement Manager]
    end

    MM --> FF[First Fit]
    MM --> BF[Best Fit]
    MM --> WF[Worst Fit]

    PM --> PT[Page Tables]
    PM --> TLB[TLB Cache]
    PM --> FA[Frame Allocation]

    PR --> FIFO[FIFO]
    PR --> LRU[LRU]
    PR --> OPT[Optimal]
    PR --> SC[Second Chance]
    PR --> CLK[Clock]
```

## 6. Deadlock Management

```mermaid
flowchart TD
    subgraph Avoidance["Deadlock Avoidance"]
        BA[Bankers Algorithm]
        BA --> AM["Allocation Matrix"]
        BA --> MX["Max Matrix"]
        BA --> NM["Need Matrix = Max - Alloc"]
        BA --> AV["Available Vector"]
        BA --> SS["Safe Sequence Check"]
    end

    subgraph Detection["Deadlock Detection"]
        DD[Detection Algorithm]
        DD --> RAG["Resource Allocation Graph"]
        DD --> CD["Cycle Detection"]
        DD --> DP["Deadlocked Processes"]
    end

    REQ[Resource Request] --> BA
    BA -->|Safe| GRANT[Grant Request]
    BA -->|Unsafe| DENY[Deny Request]

    POLL[Periodic Check] --> DD
    DD -->|Deadlock Found| RESOLVE[Recovery]
    DD -->|No Deadlock| OK[Continue]
```

## 7. Client-Server Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React)
    participant A as API (Express)
    participant K as Kernel
    participant S as Subsystem

    U->>F: Interact with App
    F->>A: HTTP Request (GET/POST)
    A->>K: Access Kernel
    K->>S: Delegate to Subsystem
    S-->>K: Compute Result
    K-->>A: Return Data
    A-->>F: JSON Response
    F-->>U: Render Updated UI
```

## 8. Theme System

```mermaid
flowchart LR
    CSS[NovaTheme.css] --> Dark[":root (Dark)"]
    CSS --> Light["[data-theme=light]"]

    Dark --> DV["--nova-bg-1: #0a0e1a\n--nova-surface: #111827\n--nova-text: #e2e8f0\n--nova-accent: #38bdf8"]

    Light --> LV["--nova-bg-1: #f1f5f9\n--nova-surface: #ffffff\n--nova-text: #1e293b\n--nova-accent: #0284c7"]

    DV --> Apps["All 20 System Apps\nvia var(--nova-*)"]
    LV --> Apps
```
