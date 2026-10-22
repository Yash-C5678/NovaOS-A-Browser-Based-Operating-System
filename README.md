# NovaOS — Web-Based Operating System Simulator

**NovaOS** is a full-stack, web-based operating system simulator built for educational demonstration of core OS concepts. It provides an interactive desktop environment with a window manager, taskbar, application launcher, and a suite of system applications that simulate real operating system subsystems.

---

## Technology Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | React 19 + Vite 8             |
| Backend   | Node.js 22 + Express 5        |
| Styling   | CSS Custom Properties (Aurora Design System) |
| Build     | Vite (Rolldown)               |
| Linting   | oxlint                        |

---

## Project Structure

```
NovaOS/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                 # Root application
│   │   ├── NovaTheme.css           # Aurora Design System tokens
│   │   ├── components/
│   │   │   ├── apps/               # System applications (20 apps)
│   │   │   ├── desktop/            # Shell, launcher, window manager
│   │   │   ├── system/             # Boot screen, login, lock
│   │   │   ├── ui/                 # Reusable UI components
│   │   │   └── window/             # Window chrome and controls
│   │   └── ...
│   └── package.json
│
├── server/                         # Express backend
│   ├── app.js                      # Express application + route mounting
│   ├── server.js                   # HTTP server entry point
│   ├── api/
│   │   ├── kernel.js               # Kernel singleton
│   │   └── routes/                 # 16 RESTful route modules
│   └── os/                         # OS subsystem implementations
│       ├── kernel/                 # Kernel + application registry
│       ├── scheduler/              # CPU scheduling (6 algorithms)
│       ├── memory/                 # Memory management (3 fit algorithms)
│       ├── process/                # Process lifecycle management
│       ├── deadlock/               # Banker's algorithm + detection
│       ├── synchronization/        # Mutex + Semaphore primitives
│       ├── filesystem/             # Virtual filesystem
│       ├── devices/                # Device simulation
│       ├── io/                     # I/O management
│       └── ...
│
├── docs/                           # Project documentation
├── diagrams/                       # Architecture diagrams
└── research/                       # Research materials
```

---

## OS Subsystems

### CPU Scheduling
Interactive simulator supporting six scheduling algorithms with dynamic process input, Gantt chart visualization, and per-process metric computation.

| Algorithm             | Type        | Key Characteristic                    |
|-----------------------|-------------|---------------------------------------|
| FCFS                  | Non-Preemptive | First Come First Served              |
| SJF                   | Non-Preemptive | Shortest Job First                   |
| SRTF                  | Preemptive  | Shortest Remaining Time First         |
| Round Robin           | Preemptive  | Configurable time quantum             |
| Priority              | Non-Preemptive | Lower numeric value = higher priority |
| Preemptive Priority   | Preemptive  | Priority-based preemption             |

**Features:**
- Dynamic process table: Add, Edit, Remove, Clear All, Reset Defaults
- Configurable Round Robin time quantum
- PID uniqueness validation and input sanitization
- Real-time Gantt chart rendering
- Metrics: Completion Time, Turnaround Time, Waiting Time, Response Time
- Averages and CPU utilization statistics
- Behavioral analysis and observations panel

### Memory Management
- **Allocation algorithms:** First Fit, Best Fit, Worst Fit
- Block allocation, deallocation, and coalescing
- Memory fragmentation visualization
- Memory statistics and utilization tracking

### Paging & Virtual Memory
- Page table management with frame allocation
- Page replacement algorithms: FIFO, LRU, Optimal, Second Chance, Clock
- TLB simulation with hit/miss tracking
- Multi-level page table support
- Working set analysis

### Segmentation
- Segment table management
- Segment allocation and deallocation
- Memory map visualization
- Protection and sharing simulation

### Deadlock Management
- **Banker's Algorithm** for safe-state detection and deadlock avoidance
- **Deadlock Detection** using resource allocation graph analysis
- Resource request and release simulation
- Need matrix computation

### Process Synchronization
- **Mutex** locks with ownership tracking
- **Semaphore** (counting) with wait queues
- Synchronization statistics

### Process Management
- Process creation, state transitions, and termination
- Process state model: New → Ready → Running → Waiting → Terminated
- Process control block (PCB) tracking

### I/O Management
- Device simulation and I/O request queuing
- I/O scheduling and completion tracking

---

## Desktop Environment

NovaOS provides a complete desktop experience:

- **Desktop Shell** — Wallpaper, desktop icons, and system tray
- **Window Manager** — Draggable, resizable windows with minimize/maximize/close
- **Application Launcher** — Searchable app grid with categorized navigation
- **Taskbar** — Running application indicators, clock, and system status
- **Settings** — Theme switching (Dark / Light mode), wallpaper, about system
- **Notifications** — System-wide notification center
- **Authentication** — User login, registration, and session management

### Built-in Applications

| Application         | Description                                      |
|---------------------|--------------------------------------------------|
| Process Manager     | View and manage OS processes                     |
| CPU Scheduler       | Interactive scheduling algorithm simulator       |
| Memory Manager      | Memory allocation visualization                  |
| Paging              | Page table and virtual memory simulator          |
| Virtual Memory      | Extended virtual memory management               |
| Page Replacement    | Page replacement algorithm comparison            |
| Segmentation        | Segment table management                         |
| Deadlock Manager    | Banker's algorithm and deadlock detection         |
| Synchronization     | Mutex and semaphore demonstrations               |
| Resource Monitor    | System resource utilization dashboard             |
| I/O Manager         | Device and I/O request management                |
| File Explorer       | Virtual filesystem browser                       |
| Terminal            | Command-line interface                           |
| System Logs         | Kernel and system event log viewer               |
| Browser             | Built-in web browser                             |
| Notepad             | Text editor                                      |
| Calculator          | Standard calculator                              |
| Camera              | Camera application                               |
| Gallery             | Image gallery viewer                             |
| Settings            | System configuration and appearance              |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd NovaOS

# Install frontend dependencies
npm --prefix client install

# Install backend dependencies
npm --prefix server install
```

### Development

```bash
# Start the backend (port 5000)
npm --prefix server run dev

# Start the frontend (port 5173)
npm --prefix client run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
npm --prefix client run build
```

### Linting

```bash
npm --prefix client run lint
```

---

## API Reference

All endpoints are prefixed with `/api`.

| Route Prefix             | Description                          |
|--------------------------|--------------------------------------|
| `/api/health`            | Health check                         |
| `/api/system`            | System state                         |
| `/api/applications`      | Application registry                 |
| `/api/processes`         | Process management                   |
| `/api/memory`            | Memory allocation                    |
| `/api/paging`            | Paging simulation                    |
| `/api/virtual-memory`    | Virtual memory management            |
| `/api/page-replacement`  | Page replacement algorithms          |
| `/api/segmentation`      | Segmentation management              |
| `/api/scheduler`         | CPU scheduling simulation            |
| `/api/io`                | I/O management                       |
| `/api/synchronization`   | Mutex and semaphore operations       |
| `/api/deadlock`          | Deadlock detection and avoidance     |
| `/api/filesystem`        | Virtual filesystem operations        |
| `/api/notifications`     | Notification management              |
| `/api/auth`              | Authentication and user management   |
| `/api/system-logs`       | System log querying                  |

### CPU Scheduler API

```
GET  /api/scheduler/algorithms     → List available algorithms
POST /api/scheduler/simulate       → Run scheduling simulation
```

**POST `/api/scheduler/simulate`** request body:
```json
{
  "algorithm": "round-robin",
  "timeQuantum": 2,
  "processes": [
    { "pid": "P1", "arrivalTime": 0, "burstTime": 5, "priority": 2 },
    { "pid": "P2", "arrivalTime": 1, "burstTime": 3, "priority": 1 }
  ]
}
```

---

## Testing

### Backend Unit Tests

```bash
# Scheduler correctness tests (all 6 algorithms)
node server/os/scheduler/test-scheduler-correctness.js

# Scheduler integration tests
node server/os/scheduler/test-all-algorithms.js

# Memory manager tests
node server/os/memory/test-memory-manager.js

# Deadlock tests (Banker's algorithm + detection)
node server/os/deadlock/test-deadlock.js

# Synchronization tests (Mutex + Semaphore)
node server/os/synchronization/test-synchronization.js
```

All tests pass with **0 failures**.

---

## Design System

NovaOS uses the **Aurora Design System** — a set of CSS custom properties defined in `NovaTheme.css` that provide consistent theming across all applications.

- **Dark Mode** — Default deep navy/charcoal palette
- **Light Mode** — Clean white/gray palette
- Theme switching is accessible via Settings → Appearance → Theme
- All system applications respect the global theme tokens

Key tokens: `--nova-bg-1`, `--nova-surface`, `--nova-text`, `--nova-accent`, `--nova-border`, etc.

---

## Priority Convention

Throughout NovaOS, the scheduling priority convention is:

> **Lower numeric value = Higher priority**

For example, a process with priority `1` will be scheduled before a process with priority `3`.

---

## License

This project was developed as a college Operating Systems course project (3rd Semester).
