# Setup and Execution Guide

This document provides step-by-step instructions to set up, run, and test both the **Django REST API Backend** and the **React + Vite Frontend** from the project root (`Ructe/`).

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **Python**: Version 3.11+
- **Node.js**: Version 18+ (includes `npm`)
- **Git** (optional)
- **Docker & Docker Compose** (optional, for containerized execution)

*Note: The application includes automatic keyless fallbacks (Open-Meteo Geocoding + OSRM Routing), so you can run the app immediately without any third-party API keys.*

---

## 2. Option A — Quick Start with Docker Compose (Recommended)

From the project root:

```bash
docker-compose up --build
```

- **Frontend**: Accessible at [http://localhost:5173](http://localhost:5173)
- **Backend API**: Accessible at [http://localhost:8000/api](http://localhost:8000/api)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

To stop the containers:
```bash
docker-compose down
```

---

## 3. Option B — Running Locally from Root

### Step 1: Backend Setup & Execution

Open your terminal in the project root:

#### On Windows (PowerShell / Command Prompt):
```powershell
# 1. Create Python virtual environment inside backend
python -m venv backend\.venv

# 2. Activate virtual environment
.\backend\.venv\Scripts\activate

# 3. Install backend dependencies
pip install -r backend\requirements.txt

# 4. Copy environment file (optional: edit to add Mapbox token)
copy backend\.env.example backend\.env

# 5. Run migrations
python backend\manage.py migrate

# 6. Start the Django API server on port 8000
python backend\manage.py runserver 0.0.0.0:8000
```

#### On Linux / macOS:
```bash
# 1. Create Python virtual environment inside backend
python3 -m venv backend/.venv

# 2. Activate virtual environment
source backend/.venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Copy environment file
cp backend/.env.example backend/.env

# 5. Run migrations
python backend/manage.py migrate

# 6. Start the Django API server on port 8000
python backend/manage.py runserver 0.0.0.0:8000
```

---

### Step 2: Frontend Setup & Execution

Open a second terminal window in the project root:

#### On Windows / Linux / macOS:
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Copy environment file
cp .env.example .env    # On Windows: copy .env.example .env

# 4. Start Vite development server
npm run dev
```

Open your browser to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 4. Option C — Using the Makefile (Linux / macOS / Git Bash)

If you have `make` installed:

```bash
# Install all dependencies for both backend and frontend
make install

# Run backend API server
make run-backend

# Run frontend dev server (in another terminal)
make run-frontend
```

---

## 5. Running the Automated Test Suites

### Backend Unit & API Tests (86 tests with coverage):
From the project root:
```powershell
# Windows
.\backend\.venv\Scripts\pytest.exe -c backend\pytest.ini --cov=backend\routing_app --cov-report=term backend\routing_app\tests\

# Linux / macOS
pytest -c backend/pytest.ini --cov=backend/routing_app --cov-report=term backend/routing_app/tests/
```

### Frontend Tests (Vitest):
From the project root:
```bash
cd frontend && npm run test
```

### Frontend Typecheck & Production Build:
```bash
cd frontend && npm run build
```

---

## 6. Environment Variables (Optional)

The application works out-of-the-box with free, keyless APIs. If you wish to use your own Mapbox or OpenRouteService API keys:

### `backend/.env`
- `MAPBOX_ACCESS_TOKEN`: Mapbox public token (`pk.ey...`) for Mapbox Directions & Geocoding.
- `ROUTING_PROVIDER`: `mapbox` (default) or `openrouteservice`.
- `ORS_API_KEY`: OpenRouteService API key (if using ORS).
- `SECRET_KEY`: Django secret key.
- `DEBUG`: `True` in local development.

### `frontend/.env`
- `VITE_API_BASE_URL`: `/api` (proxied to backend by Vite).
- `VITE_MAP_STYLE_URL`: Vector/raster basemap style JSON URL.
