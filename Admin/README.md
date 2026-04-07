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

## Project methodology

This admin dashboard was developed using a modular full-stack methodology. The work was divided into core feature areas such as authentication, dashboard metrics, product management, category management, order tracking, and sales reporting. Each module was implemented separately, connected to backend API endpoints, then tested incrementally to confirm that the admin workflow behaved correctly from end to end.

### Development process

1. Identify the admin operations required for managing the Cartify platform.
2. Build or connect the backend endpoints needed for each admin feature.
3. Develop the React interface for each module using reusable UI structure.
4. Test CRUD flows, data loading, and order status updates.
5. Refine the interface and documentation for presentation and submission.

### Tools used

- React
- Tailwind CSS
- Node.js
- Express
- MongoDB
- REST APIs

## API endpoints used

- `POST /api/auth/login`
- `GET /api/admin/dashboard`
- `GET/POST/PUT/DELETE /api/admin/products`
- `GET/POST/PUT/DELETE /api/admin/categories`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/users`
- `GET /api/admin/sales`

## Documentation images

Add your screenshots in this section. Put the image files in a folder like `docs/images/` and replace the sample file names below with your actual screenshots.

### Login page

![Login page screenshot](docs/images/login-page.png)

### Dashboard

![Dashboard screenshot](docs/images/dashboard.png)

### Product management

![Product management screenshot](docs/images/products.png)

### Orders page

![Orders page screenshot](docs/images/orders.png)

### Sales summary

![Sales summary screenshot](docs/images/sales-summary.png)
