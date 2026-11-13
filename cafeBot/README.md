# CafeBot AI Ordering System

A clean, modular, beginner-friendly cafe ordering assistant featuring a realistic menu dataset, mock conversational ordering flow, a responsive Chat UI, and an interactive 3D spatial barista counter built with Three.js and XR Blocks.

## Architecture

```text
Customer → Web Chat UI → (Future Backend API) → (Future AI Model API)
```

Ordering workflow:

```text
System Prompt + Menu (data/menu.json)
  → Order State
  → Customer Confirmation
  → Saved Orders JSON (data/orders.json)
  → Staff Dashboard (future stage)
```

> **Current Scope**: Visual Chat UI, realistic `data/menu.json`, 3D spatial counter preview, and mock conversational responses. No external AI API, database, or authentication is connected yet.

## Project Structure

```text
cafeBot/
├── CLAUDE.md                 # Permanent development & safety rules
├── README.md                 # Project overview and local setup
├── prompts/
│   └── system-prompt.md      # System prompt template for future AI stage
├── data/
│   ├── menu.json             # 14 realistic cafe products across 6 categories
│   └── orders.json           # Confirmed orders store (empty array by default)
├── frontend/
│   ├── index.html            # Standalone vanilla HTML Chat UI
│   ├── styles.css            # Cafe-themed responsive styles
│   └── app.js                # Vanilla JS mock chat & order state handler
├── backend/
│   └── README.md             # Future API & order persistence specification
└── config/
    └── .env.example          # Environment variable template (no secrets)
```

## Running Locally

### Option 1: Full 3D XR + Chat UI App (Vite + XR Blocks)
From the repository root:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### Option 2: Standalone Vanilla Frontend (`cafeBot/frontend`)
Serve the `cafeBot/` directory with any static server:
```bash
npx serve cafeBot
```
Then open `/frontend/` in your browser.
