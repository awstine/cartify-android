# Cartify Android

## Secure MongoDB Backend (new)

This project now includes a backend scaffold at `backend/` using:
- Node.js + Express
- MongoDB Atlas (via Mongoose)
- JWT auth
- Env-based secrets (no hardcoded credentials)

### 1) Backend setup

```bash
cd backend
cp .env.example .env
```

Set values in `.env`:
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT` (default `4000`)

Install and run:

```bash
npm install
npm run dev
```

Optional seed:

```bash
npm run seed
```

Health check:

```bash
GET http://localhost:4000/health
```

### 2) Backend API routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/cart` (Bearer token)
- `POST /api/cart/items` (Bearer token)
- `PATCH /api/cart/items/:productId` (Bearer token)
- `DELETE /api/cart/items/:productId` (Bearer token)
- `POST /api/cart/checkout` (Bearer token)

### 3) Android integration points

Android has backend-ready Retrofit scaffolding:
- `app/src/main/java/com/cartify/data/remote/backend/BackendApiService.kt`
- `app/src/main/java/com/cartify/data/remote/backend/BackendRetrofitInstance.kt`
- `app/src/main/java/com/cartify/data/repository/BackendRepository.kt`

Base URL is controlled by:
- `BuildConfig.BACKEND_BASE_URL` in `app/build.gradle.kts`
- default: `http://10.0.2.2:4000/api/` (Android emulator -> local machine)

### 4) Security notes

- Never hardcode MongoDB credentials in app or backend source.
- Rotate any credential shared in chat/history.
- Keep `backend/.env` private (`.gitignore` is configured).
