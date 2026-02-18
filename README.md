# DeGesh CRM

Full-stack CRM with a React + Vite frontend and a FastAPI backend.

## Project overview

This repository contains:

- A Vite + React + TypeScript frontend (`src/`).
- A FastAPI + SQLAlchemy backend (`FastAPIProject/`).

The frontend consumes the backend HTTP API under `/api/v1`.

## Frontend setup

Requirements: Node.js 18+.

```sh
npm install
npm run dev
```

The dev server runs on http://localhost:8080 and proxies `/api` requests to the backend.

## Backend setup

Requirements: Python 3.10+ and LibreOffice (for DOCX → PDF preview export).

```sh
cd FastAPIProject
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Debian/Ubuntu only: sudo apt-get install libreoffice-writer
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000/api/v1.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Repository layout

- `src/`: Vite + React frontend code.
- `FastAPIProject/`: FastAPI backend code (API, models, schemas, and services).
