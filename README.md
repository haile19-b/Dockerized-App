# Dockerized AI Chatbot Application

A simple, full-stack AI chatbot built with **Next.js**, **Node.js (Express)**, **PostgreSQL**, and the **Google Gemini API**, fully containerized using **Docker** and **Docker Compose**.

---

## 🐳 How This Application is Dockerized

The primary objective of this project is to demonstrate real-world containerization concepts using Docker and Docker Compose:

1. **Multi-Container Architecture:**
   The application is divided into three isolated, purpose-built containers:
   - `frontend`: Runs the Next.js chat interface using a multi-stage production build.
   - `backend`: Runs the Express REST API and communicates securely with the Gemini API.
   - `db`: Runs official PostgreSQL 16 Alpine for persistent conversation storage.

2. **Docker Bridge Network (`chatbot-network`):**
   Containers communicate securely over an internal user-defined bridge network using Docker's internal DNS resolution (e.g., the backend connects to `postgres://...db:5432/...`).

3. **Persistent Storage with Named Volumes (`chatbot_pgdata`):**
   PostgreSQL stores its database cluster on a Docker named volume (`pgdata`). Even when containers are stopped, removed, or recreated, all messages and chat history are safely preserved.

4. **Service Healthchecks & Dependency Sequencing:**
   The `db` container implements an active `pg_isready` healthcheck. Docker Compose sequences service startup so the `backend` waits for the database to be fully healthy (`condition: service_healthy`) before launching.

5. **Security & Secrets Isolation:**
   The `GEMINI_API_KEY` is loaded strictly in the backend container via environment variables and is never baked into image layers or exposed to the client-side frontend.

6. **Optimized Multi-Stage Builds:**
   The frontend uses a 3-stage `Dockerfile` (deps, builder, runner) utilizing Next.js `standalone` mode, resulting in a minimal, lightweight production image.

---

## 🌐 Port Mapping & Services

To avoid port collisions with any applications already running on your host machine, the following conflict-free host ports are used:

| Service | Container Name | Container Port | Host Port | Host URL / Access |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `chatbot_frontend` | `3000` | **`3001`** | [http://localhost:3001](http://localhost:3001) |
| **Backend** | `chatbot_backend` | `5000` | **`5001`** | [http://localhost:5001](http://localhost:5001) |
| **Database** | `chatbot_db` | `5432` | **`5433`** | `localhost:5433` (Internal network uses `db:5432`) |

---

## 📋 Prerequisites

- **Docker Desktop** (version 20.10+ or higher)
- **Docker Compose** (v2+)

---

## 🚀 Quick Start (Single Command)

### 1. Configure Environment Variables
Copy the template `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and add your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
*(Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/)).*

### 2. Build and Start the Application
Start all services with a single Docker Compose command:

```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up --build -d
```

### 3. Open the App in Your Browser
Visit [http://localhost:3001](http://localhost:3001) to interact with the AI chatbot!

---

## 🧪 Testing & Verification

### 1. Verify Container Status
Check that all three containers are up and running:
```bash
docker compose ps
```

### 2. Verify Backend & Database Health
Test the backend healthcheck endpoint:
```bash
curl http://localhost:5001/api/health
```
**Expected response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-10-19T...",
  "uptime": 12.34
}
```

### 3. Test Chat Message API
Send a prompt via `curl`:
```bash
curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Docker?"}'
```

### 4. Verify Message Persistence Across Restarts
1. Open [http://localhost:3001](http://localhost:3001) and send a few chat messages.
2. Stop the containers:
   ```bash
   docker compose down
   ```
3. Restart the containers:
   ```bash
   docker compose up -d
   ```
4. Refresh [http://localhost:3001](http://localhost:3001). Notice that all previous messages remain stored in PostgreSQL and load automatically!

---

## 🛠️ Helpful Commands

| Action | Command |
| :--- | :--- |
| View logs for all containers | `docker compose logs -f` |
| View logs for backend only | `docker compose logs -f backend` |
| View logs for frontend only | `docker compose logs -f frontend` |
| Stop all containers | `docker compose down` |
| Stop containers and delete volume | `docker compose down -v` |
| Rebuild all containers | `docker compose up --build -d` |
| Access database with psql | `docker compose exec db psql -U postgres -d chatbot_db` |

---

## 🔄 CI/CD Pipeline (GitHub Actions)

This project includes an automated **Continuous Integration (CI)** pipeline configured with GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

Whenever changes are pushed to `main` or a Pull Request is opened:
1. **Docker Buildx Setup:** Initializes an optimized Docker builder on an Ubuntu runner.
2. **Configuration Validation:** Validates `docker compose config` syntax.
3. **Multi-Container Build:** Builds the `frontend` and `backend` images and pulls PostgreSQL.
4. **Service Startup & Health Polling:** Launches the full stack and waits for database healthchecks.
5. **End-to-End API Verification:**
   - Validates `GET /api/health` returns `status: ok` and `database: connected`.
   - Sends a test message via `POST /api/chat`.
   - Verifies message storage via `GET /api/messages`.
   - Verifies the Next.js frontend returns HTTP `200 OK`.
6. **Automatic Cleanup:** Safely tears down containers and volumes.

