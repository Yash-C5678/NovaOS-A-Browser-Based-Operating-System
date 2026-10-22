# NovaOS — API Documentation

All API endpoints return JSON with the following envelope:

```json
{
  "success": true | false,
  "data": { ... },
  "error": "Error message (only when success is false)"
}
```

Base URL: `http://localhost:5000`

---

## Health Check

```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "service": "NovaOS API",
  "status": "online"
}
```

---

## CPU Scheduler

### List Available Algorithms

```
GET /api/scheduler/algorithms
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "fcfs",               "name": "FCFS",               "preemptive": false },
    { "id": "sjf",                "name": "SJF",                "preemptive": false },
    { "id": "srtf",               "name": "SRTF",               "preemptive": true  },
    { "id": "round-robin",        "name": "Round Robin",        "preemptive": true  },
    { "id": "priority",           "name": "Priority",           "preemptive": false },
    { "id": "preemptive-priority","name": "Preemptive Priority", "preemptive": true  }
  ]
}
```

### Run Simulation

```
POST /api/scheduler/simulate
```

**Request Body:**
```json
{
  "algorithm": "round-robin",
  "timeQuantum": 2,
  "processes": [
    { "pid": "P1", "arrivalTime": 0, "burstTime": 5, "priority": 2 },
    { "pid": "P2", "arrivalTime": 1, "burstTime": 3, "priority": 1 },
    { "pid": "P3", "arrivalTime": 2, "burstTime": 2, "priority": 3 }
  ]
}
```

| Field         | Type     | Required | Description                              |
|---------------|----------|----------|------------------------------------------|
| algorithm     | string   | No       | Algorithm ID (default: `"fcfs"`)         |
| timeQuantum   | number   | No       | Round Robin quantum (default: `2`)       |
| processes     | array    | Yes      | Array of process objects                 |
| processes[].pid        | string | No  | Display label (default: auto-generated)  |
| processes[].arrivalTime| number | Yes | Non-negative integer                     |
| processes[].burstTime  | number | Yes | Positive integer                         |
| processes[].priority   | number | No  | Lower = higher priority (default: `0`)   |

**Response:**
```json
{
  "success": true,
  "data": {
    "algorithm": "Round Robin",
    "completed": true,
    "currentTime": 10,
    "timeline": [
      { "pid": "nova-1000", "startTime": 0, "endTime": 2 },
      { "pid": "nova-1001", "startTime": 2, "endTime": 4 },
      ...
    ],
    "statistics": {
      "currentTime": 10,
      "totalCpuTime": 10,
      "idleTime": 0,
      "cpuUtilization": 100,
      "contextSwitches": 3
    },
    "averages": {
      "averageWaitingTime": 4.00,
      "averageTurnaroundTime": 7.33,
      "averageResponseTime": 1.00
    },
    "processes": [
      {
        "pid": "nova-1000",
        "displayPid": "P1",
        "applicationId": "sim-P1",
        "priority": 2,
        "arrivalTime": 0,
        "burstTime": 5,
        "remainingBurstTime": 0,
        "startTime": 0,
        "completionTime": 15,
        "turnaroundTime": 15,
        "waitingTime": 10,
        "responseTime": 0,
        "cpuTime": 5,
        "state": "terminated"
      }
    ]
  }
}
```

**Error Responses:**
- `400` — Invalid input (missing processes, non-integer times, etc.)

---

## Processes

```
GET    /api/processes              — List all processes
POST   /api/processes              — Create a process
GET    /api/processes/:pid         — Get process details
DELETE /api/processes/:pid         — Terminate a process
```

---

## Memory

```
GET    /api/memory                 — Get memory state
POST   /api/memory/allocate        — Allocate memory block
POST   /api/memory/deallocate      — Deallocate memory block
```

---

## Paging

```
GET    /api/paging                 — Get paging state
POST   /api/paging/access          — Access a page (triggers TLB / page table lookup)
```

---

## Page Replacement

```
GET    /api/page-replacement/algorithms  — List available algorithms
GET    /api/page-replacement/statistics  — Get replacement statistics
GET    /api/page-replacement/snapshot    — Get current state snapshot
GET    /api/page-replacement/default     — Get default configuration
POST   /api/page-replacement/default     — Set default configuration
POST   /api/page-replacement/simulate    — Run simulation
POST   /api/page-replacement/compare     — Compare algorithms
POST   /api/page-replacement/victim      — Select victim page
POST   /api/page-replacement/reset       — Reset state
```

**Supported algorithms:** FIFO, LRU, Optimal, Second Chance, Clock

---

## Segmentation

```
GET    /api/segmentation           — Get segmentation state
POST   /api/segmentation/allocate  — Allocate segment
POST   /api/segmentation/deallocate— Deallocate segment
```

---

## Deadlock

```
GET    /api/deadlock               — Get deadlock state
POST   /api/deadlock/detect        — Run deadlock detection
POST   /api/deadlock/request       — Request resource
POST   /api/deadlock/release       — Release resource
```

---

## Synchronization

```
GET    /api/synchronization        — Get synchronization state
POST   /api/synchronization/mutex  — Mutex operations
POST   /api/synchronization/semaphore — Semaphore operations
```

---

## I/O

```
GET    /api/io                     — Get I/O state
POST   /api/io/request             — Submit I/O request
```

---

## Filesystem

```
GET    /api/filesystem             — List filesystem contents
POST   /api/filesystem             — Create file/directory
DELETE /api/filesystem             — Delete file/directory
```

---

## Notifications

```
GET    /api/notifications                        — List all notifications
GET    /api/notifications/unread                  — List unread notifications
GET    /api/notifications/snapshot                — Get notification snapshot
GET    /api/notifications/statistics              — Get notification statistics
GET    /api/notifications/:notificationId         — Get single notification
POST   /api/notifications/:notificationId/read    — Mark as read
POST   /api/notifications/:notificationId/unread  — Mark as unread
POST   /api/notifications/read-all                — Mark all as read
DELETE /api/notifications/:notificationId         — Delete notification
DELETE /api/notifications                         — Clear all notifications
```

---

## Authentication

```
POST   /api/auth/register                  — Register new user
POST   /api/auth/login                     — Login
POST   /api/auth/logout                    — Logout
GET    /api/auth/current                   — Get current user
GET    /api/auth/snapshot                  — Get auth snapshot
GET    /api/auth/users                     — List all users (admin)
POST   /api/auth/users                     — Create user (admin)
PATCH  /api/auth/users/:userId/enable      — Enable user (admin)
PATCH  /api/auth/users/:userId/disable     — Disable user (admin)
DELETE /api/auth/users/:userId             — Delete user (admin)
GET    /api/auth/profile                   — Get user profile
```

---

## System Logs

```
GET    /api/system-logs                    — Query logs
GET    /api/system-logs/recent             — Get recent logs
GET    /api/system-logs/snapshot           — Get log snapshot
GET    /api/system-logs/statistics         — Get log statistics
GET    /api/system-logs/:logId             — Get single log entry
DELETE /api/system-logs                    — Clear all logs
```

**Query Parameters:**

| Parameter | Description                   |
|-----------|-------------------------------|
| level     | Filter by level (e.g. `error`)|
| source    | Filter by source (e.g. `kernel`)|
| type      | Filter by event type          |
| search    | Full-text search              |
| limit     | Max results (default: 50)     |
