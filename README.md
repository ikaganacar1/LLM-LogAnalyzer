# KubeSentinel

AI-Powered Kubernetes Incident Manager with real-time log analysis and automated remediation proposals.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Python Backend │────▶│  Ollama LLM     │
│  (Port 3000)    │     │  (Port 8000)    │     │  (Port 11434)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Project Structure

```
kubesentinel/
├── frontend/              # React + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── services/      # API client
│   │   └── types.ts       # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── backend/               # Python FastAPI
│   ├── app/
│   │   ├── main.py        # Entry point
│   │   ├── config.py      # Settings
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Ollama integration
│   │   └── routes/        # API endpoints
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml
```

## Quick Start with Docker

```bash
# Start all services
docker-compose up --build

# Pull the Ollama model (first time only)
docker exec kubesentinel-ollama ollama pull gpt-oss:20b
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Ollama
```bash
ollama serve
ollama pull gpt-oss:20b
```

## Features

- Real-time Kubernetes log simulation
- AI-powered incident detection and analysis
- Automated remediation proposals (scale_deployment)
- Approve/Ignore workflow for human-in-the-loop
