# How to Run Locally

Since this is a Fullstack app (Vite Frontend + Express Backend), you need to run **two** separate terminals.

## 1. Frontend (Vite)
Runs the React interface.
```bash
npm run dev
```
- Access at: `http://localhost:5173`

## 2. Backend (Express)
Runs the API server that connects to Supabase.
```bash
node server.js
```
- Server API runs at: `http://localhost:3000`

> [!TIP]
> Make sure both are running at the same time for the app to work!
