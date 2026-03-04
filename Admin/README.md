# Cartify Admin Dashboard

React + Tailwind admin web app that shares the same Cartify backend and MongoDB.

## 1) Backend setup

Inside `backend/` create `.env` from `.env.example`.

Important: put one or more admin emails in `ADMIN_EMAILS` (comma-separated).

## 2) Start backend

```bash
cd backend
npm install
npm run dev
```

## 3) Start admin app

```bash
cd Admin
npm install
cp .env.example .env
npm run dev
```

## Admin features

- Dashboard metrics
- Product create/edit/delete
- Category create/delete
- Orders list + status update
- Users list
- Sales summary + top products

## API endpoints used

- `POST /api/auth/login`
- `GET /api/admin/dashboard`
- `GET/POST/PUT/DELETE /api/admin/products`
- `GET/POST/PUT/DELETE /api/admin/categories`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/users`
- `GET /api/admin/sales`
