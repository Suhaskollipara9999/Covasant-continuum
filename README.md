# Covasant Continuum

Enterprise AI-powered knowledge management and documentation platform.

## Project Structure

```
Covasant-Continuum/
├── frontend/              # React + Vite frontend application
│   ├── src/               # Source code (components, hooks, stores, utils)
│   ├── public/            # Static assets
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/               # FastAPI Python backend
│   ├── app/               # Application source (api, models, services, core)
│   └── requirements.txt
│
├── .env                   # Unified environment variables (Frontend & Backend)
├── docker-compose.yml     # Local dev services (PostgreSQL, Redis, Elasticsearch)
├── requirements.txt       # Python dependencies (pip freeze)
├── .gitignore
└── README.md
```

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Infrastructure (Docker)
```bash
docker-compose up -d
```