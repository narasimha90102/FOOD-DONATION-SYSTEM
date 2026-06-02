# FoodBridge AI - Enterprise Surplus Food Redistribution Platform

FoodBridge AI is a state-of-the-art, monorepo-structured full-stack Mobile + Web ecosystem designed to prevent food waste. It automates safe redistribution by running microbiological mathematical decay simulations and matching surplus listings to the closest registered NGOs in real-time.

---

## 🚀 Key Features

* **Microbiological Decay Predictor (Arrhenius AI Model)**: Runs Arrhenius degradation equations dynamically on food category types (veg, non-veg, bakery, stable rations) and temperature states (ambient, cold, frozen) to calculate remaining safe hours.
* **NGO Proximity Radar & Haversine Matches**: Performs real-time geospatial matches and trigonometric calculations to sort surpluses by physical proximity (in kilometers).
* **SVG Vector Tracking Navigation**: Plots active coordinates on Next.js vector grids, rendering dynamic paths and simulated carrier follow routines.
* **Unified WebSocket Coordinations**: Connects Socket.io message pools for live chat channels between donors and NGOs, featuring unread saw ticks, attachments, and typing statuses.
* **Telemetry Control Desk**: Displays frequency bar charts using Recharts, manages legal NGO registrations, and enables quick user blocking.

---

## 🛠️ Tech Stack

### Web Client
* **Core**: Next.js 15, React 19, TypeScript
* **State Manager**: Zustand
* **Styles**: Glassmorphic Tailwind CSS
* **Telemetry**: Recharts, Framer Motion

### Mobile Client
* **Core**: React Native (Expo SDK 51), TypeScript
* **APIs**: Expo Location, Expo Notifications
* **State**: Zustand

### Backend Server
* **Core**: NodeJS, ExpressJS, TypeScript
* **Database**: MongoDB, Mongoose ODM
* **Socketry**: Socket.io

---

## 📂 Repository Architecture

```text
FOOD BRIDGE AI/
├── backend/            # Express REST API, Sockets & AI Services
├── frontend/           # NextJS 15 Tailwind Web Portal
├── mobile/             # Expo React Native App
├── docker-compose.yml  # Multi-Container configuration
├── package.json        # Concurrent workspace manager scripts
└── .gitignore          # Build ignore configs
```

---

## 🔌 Default Local Ports

| Service | Target Port | Description |
| :--- | :--- | :--- |
| **Frontend Web** | `http://localhost:3003` | Glassmorphic React dashboard portals |
| **Backend Server** | `http://localhost:5003` | Rest API and WebSocket connections |
| **Database** | `mongodb://localhost:27017` | Local Mongoose DB persistence |

---

## 🛠️ Getting Started Locally

Ensure you have [NodeJS (v18+)](https://nodejs.org/) installed.

### Step 1: Install Dependencies
Install packages across all three folders:
```bash
npm run install:all
```

### Step 2: Set Environment Values
Rename backend env config:
* Copy `./backend/.env` to configure ports and connection fallbacks (pre-configured to fall back to `5003` and local DBs safely).

### Step 3: Start Dev Servers Concurrently
Boot the whole monorepo under a single CLI window:
```bash
npm run dev
```

---

## 🐳 Running with Docker

Run all services inside Alpine container environments:
```bash
docker-compose up --build
```
This builds and boots:
* MongoDB Container (`27017`)
* Express API Container (`5003`)
* Next.js Web Client Container (`3003`)
