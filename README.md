# Enterprise Search RAG - Interactive Architecture Map

This project is an interactive visualization of an enterprise-grade Search + RAG platform.
It helps explain, end-to-end, how data and decisions flow through a modern AI search stack:

- Consumer interactions and event ingestion
- Indexing and retrieval (including hybrid search paths)
- RAG orchestration with model inference
- Risk/compliance checkpoints and business KPI impact

The app can also call **Google Gemini API** to simulate AI support answers and media generation.

## What this project is useful for

- Demonstrating Search/RAG architecture to technical and non-technical stakeholders
- Presenting platform strategy and ROI trade-offs in a visual way
- Exploring step-by-step lifecycle simulations for product, data, and AI teams

## Features

- **Interactive architecture graph**: Zoom, pan, and explore nodes (Kafka, Vertex AI, Redis, etc.)
- **Step-by-step simulation**: Visualizes the lifecycle of an order (Discovery -> Transaction -> Fulfillment -> Support)
- **RAG & GenAI integration**: Uses Gemini to simulate support agent responses and generate videos
- **Real-time ROI inspector**: View simulated metrics (latency, conversion lift, GMV impact) for every step

## Prerequisites

- **Node.js** (v18+)
- **npm**
- **Google Gemini API Key** (optional for AI-powered features)

## 🚀 Quick Start (Local Development)

1. **Install dependencies**
    ```bash
    npm install
    ```

2. **Configure API key**
    You can set the API key in a `.env` file or pass it inline.
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_api_key_here
    ```

3. **Run development server**
    ```bash
    npm run dev
    ```
    Open `http://localhost:10000` in your browser.

## 🛠 Build for Production

To create a static build optimized for deployment:

1.  **Build**
    ```bash
    npm run build
    ```
    This generates a `dist/` folder containing static assets.

2.  **Preview Production Build**
    ```bash
    npm run preview
    ```

## 🌐 Deploying to GitHub Pages

This repository now includes a GitHub Actions workflow at:

`/.github/workflows/deploy-pages.yml`

It builds the Vite app and deploys `dist/` to GitHub Pages on pushes to `main` (or manually via `workflow_dispatch`).

### One-time repository setup

1. In **GitHub > Settings > Pages**, set **Source** to **GitHub Actions**.
2. Ensure the default branch is `main`.

After setup, the app should be published at:

`https://mbergo.github.io/enterprise-search-rag/`

## 📂 Project Structure

- `App.tsx`: Main application logic and simulation state machine
- `constants.tsx`: Definitions of nodes, edges, and static content
- `services/geminiService.ts`: Integration with Google GenAI SDK
- `components/`: Reusable UI components

## Technologies

- **Frontend**: React 19, Vite, TailwindCSS (CDN)
- **AI**: Google GenAI SDK (Gemini models)
- **Icons**: Lucide React

## License

MIT
