# Implementation Plan: Dockerized Full-Stack AI Chatbot

## 1. Project Overview & Objective
The objective is to build a simple, clean, and full-stack AI chatbot application containerized using Docker and Docker Compose. The architecture will feature three isolated container services (Frontend, Backend, and Database) communicating over an internal Docker bridge network.

The project strictly adheres to separation of concerns and security best practices: the Google Gemini API key will reside strictly on the backend and never be leaked to the frontend or version control.

---

## 2. Technology Stack & Component Architecture

| Service | Technology | Role & Container Configuration |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router, Tailwind CSS / Modern CSS) | Clean, responsive chat interface. Host port `3001` (mapped to container port `3000`). Communicates with backend REST API. |
| **Backend** | Node.js + Express | REST API server on host port `5001` (mapped to container port `5000`). Handles chat requests, manages Gemini API integration via SDK, and performs DB operations. |
| **Database** | PostgreSQL (`postgres:16-alpine`) | Relational database on host port `5433` (mapped to container port `5432`). Stores persistent message history. Data persisted via Docker named volume. |
| **AI Integration** | Google Gemini SDK (`@google/genai`) | Official Gemini SDK executed exclusively in the backend container. |
| **Orchestration** | Docker & Docker Compose | Multi-container setup with custom bridge network, healthchecks, and dependency sequencing. |

---

## 3. Project Directory Structure
```text
Dockerised-App/
├── .env.example              # Template for environment variables (DB credentials, Gemini API key)
├── .gitignore                # Ignores .env, node_modules, build outputs, and logs
├── docker-compose.yml        # Orchestrates db, backend, and frontend containers
├── implementation_plan.md    # Architecture and step-by-step plan (this document)
├── README.md                 # Setup instructions, Docker concepts, and test guide (Phase 2)
│
├── backend/
│   ├── Dockerfile            # Lightweight Node.js Alpine container
│   ├── .dockerignore
│   ├── package.json
│   └── src/
│       ├── index.js          # Express app entry point & middleware
│       ├── db.js             # PostgreSQL client pool & auto-table migration
│       ├── gemini.js         # Gemini SDK client & response generator
│       └── routes/
│           ├── chat.js       # Endpoints: GET /api/messages, POST /api/chat, DELETE /api/messages
│           └── health.js     # Endpoint: GET /api/health (checks DB & server status)
│
└── frontend/
    ├── Dockerfile            # Next.js multi-stage production build container
    ├── .dockerignore
    ├── package.json
    ├── next.config.js
    └── src/
        └── app/
            ├── layout.js     # Root layout & styling
            ├── page.js       # Chat UI (message list, prompt input, status banner)
            └── globals.css   # Styling (responsive layout, chat bubbles)
```

---

## 4. Database Schema (PostgreSQL)
A straightforward single-table schema initialized automatically on backend startup:

```sql
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Backend REST API Specification

- **`GET /api/health`**
  - Verifies server and PostgreSQL connection status.
  - Response: `{ status: "ok", database: "connected" }`
- **`GET /api/messages`**
  - Fetches conversation history in chronological order.
  - Response: `[{ id: 1, sender: "user", content: "Hello", created_at: "..." }, ...]`
- **`POST /api/chat`**
  - Request Body: `{ "message": "Explain Docker in simple terms" }`
  - Flow:
    1. Validates non-empty input.
    2. Inserts user message into PostgreSQL.
    3. Sends user prompt to Google Gemini API using `@google/genai` (model: `gemini-2.5-flash` or `gemini-1.5-flash`).
    4. Inserts Gemini response into PostgreSQL.
    5. Returns response: `{ reply: "...", userMessage: {...}, assistantMessage: {...} }`
- **`DELETE /api/messages`**
  - Clears chat history from the database to enable easy testing/demo resetting.

---

## 6. Docker & Docker Compose Design

### Network & Communication
- A bridge network `chatbot-network` connects all three containers.
- **Backend to DB**: Connects internally using container hostname `db:5432`.
- **Database Host Port**: Mapped as `5433:5432` to avoid conflicts with any local PostgreSQL instance already running on host port `5432`.
- **Backend Host Port**: Mapped as `5001:5000` (`http://localhost:5001`) for host access and client-side browser fetch requests.
- **Frontend Host Port**: Mapped as `3001:3000` (`http://localhost:3001`) to avoid conflicts with any local service running on host port `3000`.
- **PostgreSQL Volume**: Named volume `pgdata` mounted to `/var/lib/postgresql/data` ensures chat history persists across container restarts and rebuilds.

### Healthcheck & Dependency Sequencing
- `db` container specifies a healthcheck:
  ```yaml
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-chatbot_db}"]
  interval: 5s
  timeout: 5s
  retries: 5
  ```
- `backend` container waits for `db` with `condition: service_healthy`.
- `frontend` container depends on `backend`.

### Environment Configuration & Secrets Management
- `.env.example` provides default configuration with dummy values for reference:
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=postgres_password`
  - `POSTGRES_DB=chatbot_db`
  - `DB_PORT=5433`
  - `DATABASE_URL=postgres://postgres:postgres_password@db:5432/chatbot_db`
  - `GEMINI_API_KEY=your_actual_gemini_api_key_here`
  - `PORT=5000`
  - `BACKEND_PORT=5001`
  - `FRONTEND_PORT=3001`
  - `NEXT_PUBLIC_BACKEND_URL=http://localhost:5001`
- `.env` file is ignored in `.gitignore` to prevent credential exposure.
- Backend consumes `GEMINI_API_KEY` securely inside the container environment. The frontend container is never passed this secret.

---

## 7. Frontend User Experience
- **Header**: App title, quick connection status indicator (Backend & DB status check), and a "Clear History" button.
- **Chat Thread**:
  - Chronological scrollable message list.
  - Distinguishable user vs. assistant bubbles.
  - Markdown / formatted text rendering for clean display of AI answers.
- **Input Area**: Responsive text input with submit button, handling `Enter` to send and auto-disabling during API call.
- **States**: Loading / typing indicators while waiting for Gemini response, and error banners if API or network fails.

---

## 8. Implementation Steps (Phase 2 Roadmap)

1. **Step 1: Environment & Orchestration Setup**
   - Create `.gitignore` and `.env.example`.
   - Create root `docker-compose.yml` outlining `db`, `backend`, and `frontend` services with volumes, networks, and healthchecks.

2. **Step 2: Backend Development & Dockerization**
   - Initialize Node.js project in `backend/`.
   - Install dependencies: `express`, `cors`, `dotenv`, `pg`, `@google/genai`.
   - Implement PostgreSQL client and auto-table initialization in `backend/src/db.js`.
   - Implement Gemini API service in `backend/src/gemini.js`.
   - Implement REST endpoints in `backend/src/routes/` and `backend/src/index.js`.
   - Write optimized `backend/Dockerfile` and `.dockerignore`.

3. **Step 3: Frontend Development & Dockerization**
   - Scaffold Next.js application in `frontend/`.
   - Build modern chat interface in `frontend/src/app/page.js`.
   - Add chat state management (fetching history, sending message, optimistic updates, loading states).
   - Write multi-stage `frontend/Dockerfile` and `.dockerignore`.

4. **Step 4: Integration, Verification & Documentation**
   - Verify the full stack starts cleanly via `docker compose up --build`.
   - Test end-to-end user flow: send message -> backend -> Gemini API -> PostgreSQL storage -> frontend display.
   - Verify database persistence by restarting containers (`docker compose down` followed by `docker compose up`).
   - Create comprehensive `README.md` explaining Docker architecture, single-command startup, environment configuration, and verification steps.

---

## 9. Deliverables Check
- [x] Simple, unbloated architecture focused on Dockerization
- [x] Clear separation: Next.js frontend, Express backend, PostgreSQL database
- [x] Secure Gemini API handling on backend only
- [x] Defined single-command `docker compose up --build` execution
- [x] Stopped at Phase 1 waiting for user approval before writing application code
