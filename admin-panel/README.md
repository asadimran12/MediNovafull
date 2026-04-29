# MediNova Admin Panel

A full-featured dark-theme admin panel for managing MediNova users, plans, and chats.

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **MongoDB** (Atlas or local instance with `MONGO_URL` set)

---

## Backend Setup

1. `admin_router.py` is already in `Backend/` — no extra pip packages needed.
2. `Backend/main.py` has already been patched with the two required lines:
   ```python
   from admin_router import router as admin_router
   app.include_router(admin_router)
   ```
3. Start the FastAPI server:
   ```bash
   cd Backend
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

---

## Frontend Setup

```bash
cd admin-panel
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Login

Default credentials:

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

To change credentials, edit the constants at the top of `src/pages/LoginPage.jsx`:
```js
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
```

---

## Environment Variables

The frontend uses Vite's `import.meta.env`. Copy the example:

```bash
cp .env.example .env
```

| Variable        | Default                    | Description                  |
|-----------------|----------------------------|------------------------------|
| `VITE_API_URL`  | `http://localhost:8000`    | Base URL of the FastAPI backend |

When using the Vite dev-server proxy (default), you don't need to set `VITE_API_URL` — requests to `/admin` and `/users` are automatically proxied.

---

## Deploy

### Backend (Render.com)
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set `MONGO_URL` in the Render environment variables.

### Frontend (Vercel / Netlify)
- **Build command**: `npm run build`
- **Publish directory**: `dist/`
- Set `VITE_API_URL` to your deployed backend URL (e.g., `https://medinova-api.onrender.com`).

---

## Admin API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users/list` | List all users + aggregate stats |
| `GET` | `/admin/users/{username}` | Get single user document |
| `POST` | `/admin/users` | Create new user |
| `PUT` | `/admin/users/{username}/profile` | Update profile fields |
| `PUT` | `/admin/users/{username}/password` | Change password |
| `DELETE` | `/admin/users/{username}` | Delete user |
| `DELETE` | `/admin/users/{username}/chats` | Clear all chats |
| `DELETE` | `/admin/users/{username}/plans` | Clear all plans |
| `GET` | `/admin/stats` | Aggregate stats only |
