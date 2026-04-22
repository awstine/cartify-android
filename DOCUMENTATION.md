# Cartify Web Platform Documentation

Backend API and Admin Frontend Reference

Scope note: this document covers the web platform only. It documents the `backend/` service and the `Admin/` browser application. The native Android application in `app/` is intentionally excluded from scope.

## Table of Contents

1. Scope and Audience
2. Platform Summary
3. Business Capabilities
4. Repository Layout
5. Technology Stack
6. High-Level Architecture
7. Core Runtime Lifecycles
8. Backend Service Overview
9. Backend Configuration and Environment
10. Authentication and Session Handling
11. Role Model and Access Control
12. Frontend Application Architecture
13. Frontend Routing and Experience Model
14. Storefront Workflows
15. Admin Workflows
16. API Standards and Conventions
17. Authentication APIs
18. Catalog, Search, Review, and Store APIs
19. Cart, Checkout, Order, Dispute, and Return APIs
20. User, Wishlist, and Profile APIs
21. Admin API Surface
22. Data Model and Collections
23. Reporting, Analytics, and Audit Logging
24. Local Development Guide
25. Deployment Guide
26. Operations Runbook
27. Security Notes and Hardening Guidance
28. Testing and Quality Strategy
29. Known Gaps and Recommendations
30. Conclusion
31. Appendix A: Environment Variable Reference
32. Appendix B: Endpoint Inventory
33. Appendix C: Page Inventory
34. Appendix D: Release Checklist

## 1. Scope and Audience

This README is intended to function as a long-form technical handover for the Cartify web platform. It is written for:

- developers working on the backend API or the web frontend
- QA engineers validating user flows and permissions
- DevOps engineers deploying the platform
- reviewers who need to understand the structure and behavior of the system without reading every file first

The repository is a monorepo, but this document is deliberately limited to the two web-facing modules:

- `backend/`: the Node.js, Express, and MongoDB API
- `Admin/`: the React browser application that serves both storefront and admin experiences

The `app/` directory exists in the repository, but it is not documented here by design.

## 2. Platform Summary

Cartify is a multi-role commerce platform built around one backend and one browser application. The backend exposes REST-style APIs for identity, products, carts, orders, wishlists, stores, administration, reporting, disputes, and audit logs. The browser application consumes those APIs and presents two connected experiences inside one frontend codebase:

- a storefront for customers and merchants browsing products in the browser
- an authenticated back-office dashboard for merchants and platform staff

The `Admin/` folder name is historical. It is not only an admin dashboard. It also contains customer-facing storefront routes such as home, stores, product details, cart, profile, wishlist, and my orders.

At the domain level, Cartify behaves like a marketplace:

- customers can browse, save, and purchase products
- merchants can sign up, receive a store automatically, manage their catalog, and fulfill store-scoped orders
- support, managers, admins, and super admins can operate the platform with increasingly broad powers

MongoDB is the system of record. JWT bearer tokens carry authenticated identity between browser and API. Most business rules are enforced on the server, including password hashing, store provisioning, order splitting by store, coupon validation, stock enforcement in direct checkout, and audit logging for sensitive admin actions.

## 3. Business Capabilities

At a product level, the platform already supports a broad operational surface.

### Customer capabilities

- account signup and login
- store browsing and product browsing
- product search, category filtering, rating filtering, price filtering, and stock filtering
- adding products to a server-side cart
- cart checkout with coupon support
- direct order checkout from explicit item payloads
- order history and order detail retrieval
- return and refund requests after delivery
- order dispute submission
- wishlist management with alert preferences
- profile editing and address management

### Merchant capabilities

- self-service merchant signup with automatic store creation
- store-scoped dashboard access
- product CRUD within merchant scope
- store profile editing
- store-scoped order management
- shipping updates and fulfillment timeline entries
- coupon creation and management for the merchant store
- visibility into sales, growth, and disputes for owned records

### Platform staff capabilities

- dashboard metrics and low-stock visibility
- global category administration
- platform-wide product administration
- customer and system user directory access
- merchant provisioning and merchant store activation control
- dispute resolution
- sales reporting and export
- audit log inspection
- profile and password management for staff users

## 4. Repository Layout

The web platform lives in two primary top-level directories.

```text
cartify-android/
|- Admin/                 React + Vite browser application
|  |- src/
|  |  |- App.jsx          Route map
|  |  |- auth.jsx         Auth context and session persistence
|  |  |- api.js           Axios client, token injection, prefetch cache
|  |  |- components/      Shared UI and layout wrappers
|  |  |- pages/           Storefront and admin screens
|  |  |- context/         Toast and theme providers
|  |  `- storeMode.js     Store slug propagation helpers
|  `- .env.example        Frontend API base configuration
|- backend/               Node.js API
|  |- src/
|  |  |- server.js        Express bootstrap and route mounting
|  |  |- config/          Env parsing and Mongo connection
|  |  |- middleware/      Auth and role middleware
|  |  |- models/          Mongoose schemas
|  |  |- routes/          Route groups by domain
|  |  |- migrations/      One-off data repair scripts
|  |  |- utils/           Audit helpers
|  |  `- seed.js          Sample product seeding
|  `- .env.example        Backend env template
`- app/                   Android application, excluded from this document
```

This structure keeps browser and API concerns separate while still allowing them to evolve in the same repository.

## 5. Technology Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend runtime | React 18 | Main UI library for storefront and admin experiences |
| Frontend routing | React Router 6 | Uses `HashRouter`, which simplifies static hosting |
| Frontend build | Vite 5 | Fast local development and production bundling |
| Frontend styling | Tailwind CSS | Utility-first styling with custom UI primitives |
| Frontend forms | React Hook Form + Zod | Used in forms and validation-heavy admin screens |
| Frontend HTTP | Axios | Centralized API client with interceptors |
| Backend runtime | Node.js | ECMAScript module mode |
| Backend framework | Express 4 | JSON APIs and route middleware |
| Data access | Mongoose 8 | MongoDB ODM, schemas, indexes, model validation |
| Authentication | JWT + bcryptjs | Bearer tokens and password hashing |
| Validation | express-validator | Request validation for mutable endpoints |
| Reporting | PDFKit | Generates sales export PDFs |
| Data store | MongoDB | Primary persistent store |

Additional implementation details that matter operationally:

- the frontend displays currency as Kenyan shillings (`KES`) in several screens
- the backend accepts JSON payloads up to `10mb`
- the backend enables CORS globally with the default `cors()` behavior
- the admin frontend is intentionally light on dependencies and relies on shared internal UI wrappers

## 6. High-Level Architecture

The system is a standard client-server architecture with role-aware scoping layered into the API.

```text
Browser
  |
  |  HashRouter + React pages
  |  AuthProvider + Axios interceptors
  v
Cartify Web App (Admin/)
  |
  |  Bearer token over HTTP
  v
Cartify Backend (Express)
  |
  |  requireAuth / role middleware
  |  business rules / validation / audit logging
  v
MongoDB (Mongoose models)
```

The key architectural ideas are:

1. One backend serves every client type.
   Customers, merchants, support users, managers, admins, and super admins all use the same API service.

2. One browser application serves two experiences.
   The frontend contains public or customer-facing routes and protected admin routes in a single React app.

3. Store scope is a first-class concept.
   Merchants are tied to a `storeId`, and many admin queries are automatically restricted to that store.

4. MongoDB documents intentionally denormalize some historical data.
   Orders embed order items and shipping timeline details so historical order records remain stable even if the source product later changes.

## 7. Core Runtime Lifecycles

Understanding the platform is easiest when you follow a few common end-to-end flows.

### 7.1 Customer signup

1. The browser submits name, email, password, and phone number to `POST /api/auth/signup`.
2. The backend validates the payload and rejects duplicates by email.
3. Passwords are hashed with bcrypt.
4. A `User` document is created with the `customer` role.
5. An empty `Cart` and empty `Wishlist` document are automatically provisioned.
6. A JWT is issued and returned with a sanitized user object.
7. The frontend stores the token and user payload in local storage under `cartify_admin_auth`.

### 7.2 Merchant signup

1. The browser submits account details plus a store name.
2. The frontend first tries `POST /api/auth/signup-merchant`.
3. If that path is unavailable, it falls back to `/api/auth/merchant-signup` and then `/api/auth/signup/merchant`.
4. The backend creates a merchant user, generates a unique slug from the store name, creates the `Store` document, attaches `storeId` back to the user, and returns both user and store metadata.
5. The merchant is immediately authenticated and can enter the admin dashboard.

### 7.3 Storefront browsing

1. The customer lands on `/` or `/store/:storeSlug`.
2. `StoreLayout` prefetches stores and products.
3. Filters such as search text, category, in-stock-only, minimum rating, and max price are expressed as query parameters.
4. The frontend calls `/api/products` and optionally `/api/stores`.
5. Store categories in the navigation are derived from the live product payload rather than a dedicated public category API.

### 7.4 Cart checkout

1. The customer adds items using `/api/cart/items`.
2. The browser opens `/cart`, loads `/api/cart`, and displays enriched cart lines with product and store data.
3. Checkout posts to `POST /api/cart/checkout`.
4. The backend loads product data, applies coupon logic, groups items by store, creates one order per store bucket, clears the cart, and returns a consolidated summary.

### 7.5 Direct checkout

1. A client posts explicit order items to `POST /api/orders/checkout`.
2. The backend resolves products, validates stock and variants, decrements stock, validates coupons, groups lines by store, creates orders, and returns summary totals.
3. This path is authoritative for inventory reduction in the current codebase.

### 7.6 Admin product update

1. A staff user edits a product in `/admin/products`.
2. The frontend submits to `PUT /api/admin/products/:id`.
3. The backend validates role, enforces category validity, normalizes arrays such as sizes and colors, persists the update, and writes an audit log entry.
4. The updated document is returned to the UI.

## 8. Backend Service Overview

The backend boots from `backend/src/server.js`. Its responsibilities are simple and centralized:

- enable CORS
- parse JSON bodies
- expose `GET /health`
- expose a root info endpoint at `/`
- mount route groups
- connect to MongoDB before listening
- retry on nearby ports in development if the preferred port is already in use

Mounted route groups:

- `/api/auth`
- `/api/products`
- `/api/cart`
- `/api/orders`
- `/api/wishlist`
- `/api/users`
- `/api/admin`
- `/api/stores`
- `/stores` as a compatibility alias for store routes

Important implementation behaviors:

- `express.json({ limit: "10mb" })` allows fairly large payloads, especially for metadata-heavy admin requests
- the generic error handler returns `{ message: "Internal server error" }`
- the service refuses to start if MongoDB cannot be reached
- in development, the server may shift from `4000` to nearby ports if the port is busy

The backend is the enforcement layer for business rules. The frontend can suggest actions, but the backend decides whether they are valid.

## 9. Backend Configuration and Environment

Environment variables are loaded through `dotenv` in `backend/src/config/env.js`.

### Required variables

- `MONGODB_URI`
- `JWT_SECRET`

### Optional variables

- `PORT` default `4000`
- `NODE_ENV` default `development`
- `JWT_EXPIRES_IN` default `7d`
- `ADMIN_EMAILS`
- `SUPER_ADMIN_EMAILS`
- `MANAGER_EMAILS`
- `SUPPORT_EMAILS`

The email-based role lists matter more than they first appear. During login, the backend recalculates the effective role for a user based on email address and the configured env lists. This means operational role assignment can be driven by deployment configuration instead of database updates alone.

Example backend `.env`:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/cartify
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
ADMIN_EMAILS=admin@cartify.com
SUPER_ADMIN_EMAILS=
MANAGER_EMAILS=
SUPPORT_EMAILS=
```

Mongo connectivity is handled by Mongoose with a `serverSelectionTimeoutMS` of `10000`. A failed connection causes startup failure rather than degraded operation.

## 10. Authentication and Session Handling

Authentication is JWT-based across the entire web platform.

### Backend token contents

The backend signs tokens with:

- `sub`: the user id
- `email`
- `role`
- `storeId` when available

Tokens are verified by `requireAuth`, which reconstructs `req.user`.

### Frontend session persistence

The React app stores auth state in browser local storage under:

```text
cartify_admin_auth
```

That payload includes:

- `token`
- `user`

On startup, `AuthProvider` reads local storage, restores session state, and configures Axios to send:

```http
Authorization: Bearer <token>
```

### Frontend auth behaviors

- `/login` supports both login and signup in one page
- signup supports two account types: customer and merchant
- staff users redirect to `/admin` after login
- non-staff users redirect to `/`
- protected customer routes use `ProtectedRoute`
- protected staff routes use `StaffRoute`

### API base URL resolution

The frontend resolves its API base URL in this order:

1. `VITE_API_BASE_URL` if provided
2. otherwise `https://ecommerce-adroid-app-backend.onrender.com/api`

That fallback matters in production and in demos, but local development should explicitly set the env value to avoid ambiguity.

## 11. Role Model and Access Control

Cartify defines six roles:

| Role | Purpose | Typical surface |
| --- | --- | --- |
| `customer` | Buyer account | Storefront, cart, profile, orders, wishlist |
| `merchant` | Store owner | Storefront plus store-scoped admin tools |
| `support` | Service staff | Admin route group with support-level visibility |
| `manager` | Operational manager | Admin tools with broader mutation powers |
| `admin` | Platform administrator | Platform-wide admin control |
| `super_admin` | Highest-trust platform role | Full control, plus protected from deletion |

### Middleware tiers

| Middleware | Allowed roles | What it means in practice |
| --- | --- | --- |
| `requireAuth` | any authenticated user | Token must be valid |
| `requireSupportOrAbove` | merchant, support, manager, admin, super_admin | Entry gate for `/api/admin` |
| `requireManagerOrAbove` | merchant, manager, admin, super_admin | Used for product writes, coupon writes, order updates |
| `requireAdminOrAbove` | admin, super_admin | Used for destructive or platform-wide admin actions |
| `requireSuperAdmin` | super_admin | Reserved for highest-trust actions |

There is an important nuance here: `requireManagerOrAbove` includes merchants. The name suggests only managers and above, but merchants are intentionally included so they can manage their own products, coupons, and order fulfillment.

### Store scoping

The backend uses helper functions to constrain queries:

- `getStoreScope(req)` for store-bound documents like products and coupons
- `getOrderScope(req)` for orders, with merchant access based on `storeId` or `merchantUserId`

Platform admins operate without store restrictions. Merchants are filtered to owned data. Some pages also add UI-level platform-only restrictions, such as hiding the user directory, merchant directory, and audit logs from non-platform staff.

## 12. Frontend Application Architecture

The browser application is bootstrapped from `Admin/src/main.jsx` and wrapped in several providers:

- `HashRouter`
- `ThemeProvider`
- `ToastProvider`
- `AuthProvider`
- `TopProgressBar`

### Why `HashRouter` matters

Because the app uses hash-based routing, static hosting is easier:

- URLs take the form `/#/admin/products` instead of needing server-side rewrite rules
- deployments to simple static hosts are less fragile

### Shared frontend infrastructure

#### API client

`Admin/src/api.js` provides:

- a centralized Axios instance
- token injection from local storage
- a progress indicator hook for network requests
- a short-lived prefetch cache with a default TTL of 30 seconds

#### Auth context

`Admin/src/auth.jsx` provides:

- login
- customer signup
- merchant signup with route alias fallback
- logout
- user updates
- helper booleans such as `isAuthenticated` and `isStaff`

#### Theme handling

Dark mode is currently disabled in the web app. `ThemeProvider` forces a light experience and exposes a no-op toggle.

#### Toasts

The toast system provides lightweight feedback for CRUD actions, errors, and background notifications. Toasts are short-lived and dismiss automatically.

## 13. Frontend Routing and Experience Model

The routing map in `Admin/src/App.jsx` separates public, authenticated, and staff-only routes.

### Storefront routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | public | Market home |
| `/stores` | public | Store listing |
| `/store/:storeSlug` | public | Store-specific browsing |
| `/product/:id` | public | Product detail |
| `/cart` | authenticated | Server-side cart and checkout |
| `/my-orders` | authenticated | Customer order history |
| `/profile` | authenticated | Customer profile |
| `/wishlist` | authenticated | Customer wishlist |
| `/help-safety` | public | Trust and support page |
| `/login` | public | Login and signup |

### Admin routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/admin` | staff | Dashboard |
| `/admin/products` | staff | Product management |
| `/admin/categories` | staff | Category management |
| `/admin/orders` | staff | Order operations |
| `/admin/users` | platform admin | User directory |
| `/admin/merchants` | platform admin | Merchant directory and provisioning |
| `/admin/disputes` | staff | Dispute handling |
| `/admin/growth` | staff | Growth metrics |
| `/admin/sales` | staff | Sales analytics and export |
| `/admin/coupons` | staff | Coupon management |
| `/admin/audit-logs` | platform admin | Governance trail |
| `/admin/profile` | staff | Staff profile and password |

### Route wrappers

- `ProtectedRoute` redirects anonymous users to `/login`
- `StaffRoute` redirects anonymous users to `/login` and non-staff users to `/`

### Store context propagation

The frontend preserves store context through `storeMode.js` using:

- a direct route segment: `/store/:slug`
- a query parameter on other pages: `?store=<slug>`

This lets a user move from a store-specific catalog into cart, profile, and orders without losing store context.

## 14. Storefront Workflows

The storefront is not a placeholder. It implements real commerce flows in the browser.

### 14.1 Landing and browsing

`StoreLayout` prefetches:

- `/stores`
- `/products`

when the user lands on `/` or `/store/:storeSlug`. This improves perceived performance on the main shopping surface.

### 14.2 Category and search behavior

Storefront categories are not loaded from `/api/admin/categories`. Instead, the UI derives category options from currently visible product data. That means storefront category menus reflect what is actually available in the selected store or the wider marketplace.

Supported storefront product filters:

- `search`
- `category`
- `inStock`
- `minRating`
- `maxPrice`
- `storeSlug`

### 14.3 Product page

The product page:

- loads `GET /api/products/:id`
- displays product and store context
- allows adding to cart
- allows authenticated review submission with rating and optional comment
- prefetches adjacent product data when navigating through recommendations

### 14.4 Cart

The storefront cart page:

- loads the current cart from `/api/cart`
- supports quantity delta updates and line removal
- submits coupon codes and shipping address data to `/api/cart/checkout`

### 14.5 Profile and wishlist

The customer profile page aggregates:

- `/api/users/me`
- `/api/wishlist`

The wishlist page supports:

- item removal
- price-drop and back-in-stock alert toggles

### 14.6 Login and account creation

The login page supports:

- login
- customer signup
- merchant signup
- password visibility toggles
- redirect back to the originally requested route after authentication

## 15. Admin Workflows

The admin experience is organized around operational domains rather than around raw collections.

### 15.1 Dashboard

The dashboard page consumes:

- `GET /api/admin/dashboard`
- `GET /api/admin/orders?limit=5`

It renders:

- high-level counts
- total revenue
- stock value at buying price
- expected profit from remaining stock
- realized profit from sales
- a 14-day sales trend chart
- a recent orders table
- low-stock alerts

### 15.2 Product management

The products page supports:

- paginated listing
- search
- category filtering
- stock-state filtering
- client-side sorting
- create and update via modal
- delete with confirmation

The page also loads category options from `/api/admin/categories`.

### 15.3 Categories

Category administration is platform-wide. The page supports:

- listing platform categories
- create
- update
- delete
- optional parent-child category hierarchy

### 15.4 Orders and shipping

The orders page supports:

- paginated order listing
- detail drawer or modal flows based on query state
- status changes
- shipping updates
- fulfillment timeline event append operations

### 15.5 Users and merchants

The user directory is platform-admin only and supports:

- listing users
- filtering by role or scope
- creating users
- changing roles
- deleting users

The merchants page supports:

- merchant listing
- merchant creation with store creation
- store activation toggles
- merchant store metadata updates

### 15.6 Disputes, growth, sales, coupons, and audit logs

Other admin pages cover:

- disputes and resolution
- growth funnels and engagement trends
- sales summaries and exports
- coupon CRUD
- audit log browsing
- staff profile maintenance

### 15.7 Admin layout behavior

The admin shell has extra UX behavior worth noting:

- route prefetching on hover and focus
- recent order polling every 30 seconds
- unread order notification counts stored in local storage
- platform-only menu items hidden unless the user is `admin` or `super_admin`

## 16. API Standards and Conventions

The backend is pragmatic rather than formally uniform. A few conventions repeat often:

### 16.1 Base namespace

Most endpoints live under `/api`. Store routes are also mounted at `/stores` for compatibility.

### 16.2 Response style

The API does not enforce one global response envelope. Responses may be:

- raw Mongoose documents
- arrays of documents
- paginated objects with `items`, `total`, `page`, and `limit`
- action responses with `message`
- custom summary objects
- file downloads for CSV and PDF exports

### 16.3 Common status codes

| Status | Typical meaning |
| --- | --- |
| `200` | success |
| `201` | created |
| `400` | validation or malformed id failure |
| `401` | missing or invalid token |
| `403` | authenticated but forbidden |
| `404` | resource not found |
| `409` | business conflict such as duplicate email or stock failure |
| `500` | unhandled server error |

### 16.4 Pagination

Most admin list endpoints accept:

- `page`
- `limit`

and return:

- `items`
- `total`
- `page`
- `limit`

The server caps `limit` at `100`.

### 16.5 Validation

Mutable routes use `express-validator`. Invalid request bodies usually return:

```json
{
  "message": "Validation failed",
  "errors": [ ... ]
}
```

## 17. Authentication APIs

### 17.1 Public authentication endpoints

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | create customer account | also creates cart and wishlist |
| `POST` | `/api/auth/login` | authenticate existing user | may recalculate role from env email lists |
| `POST` | `/api/auth/signup-merchant` | create merchant account | also creates store |
| `POST` | `/api/auth/merchant-signup` | merchant signup alias | compatibility path |
| `POST` | `/api/auth/signup/merchant` | merchant signup alias | compatibility path |

### 17.2 Login behavior

On successful login, the API returns:

- `token`
- `user` with id, name, email, role, optional storeId, phone number, and profile image URL

If the user's email appears in one of the env-driven privileged email lists, the backend updates the stored role to match the expected role before issuing the token.

### 17.3 Customer signup behavior

Customer signup provisions:

- a `User`
- a `Cart`
- a `Wishlist`

This means downstream customer routes can assume those documents exist or can be recreated safely if missing.

### 17.4 Merchant signup behavior

Merchant signup:

- creates the user with role `merchant`
- generates a unique store slug
- creates the store
- assigns the store back to the user
- returns both user and store payloads

The implementation cleans up the user if store creation fails after user creation.

## 18. Catalog, Search, Review, and Store APIs

### 18.1 Product APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/products` | public | product listing and filtering |
| `GET` | `/api/products/:id` | public | product detail plus compact store info |
| `POST` | `/api/products/search-events` | public | search telemetry recording |
| `POST` | `/api/products/:id/reviews` | auth | create or replace current user's review |

Supported product query parameters:

- `storeId`
- `storeSlug`
- `includeDrafts`
- `category`
- `search`
- `inStock`
- `minRating`
- `maxPrice`

Notable behaviors:

- products in `draft` status are hidden unless `includeDrafts=true`
- `storeSlug` is resolved to `storeId` server-side
- rating and max-price filtering happen in memory after the main query
- reviews are embedded inside the product document and one user can only hold one active review entry per product

### 18.2 Search telemetry

`POST /api/products/search-events` is intentionally tolerant:

- authentication is optional
- the backend records search text, filters, store, and result count
- anonymous searches are still logged

These events power growth metrics later in the admin dashboard.

### 18.3 Store APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/stores` | public | list active stores by default |
| `GET` | `/api/stores/me` | auth | fetch the authenticated user's store |
| `PATCH` | `/api/stores/me` | auth | update store name, description, and logo |
| `GET` | `/stores` | public | compatibility alias for store listing |

Supported store query parameters:

- `q` keyword search
- `includeInactive=true` for inactive stores

The store list supports name, slug, and description search.

### 18.4 Store and category relationships

Products store `category` as a slug string, not as a category object id. This makes reads simple but means category rename and delete operations must propagate updates into products.

## 19. Cart, Checkout, Order, Dispute, and Return APIs

### 19.1 Cart APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/cart` | auth | load current server-side cart |
| `POST` | `/api/cart/items` | auth | add item or increase quantity |
| `PATCH` | `/api/cart/items/:productId` | auth | apply quantity delta |
| `DELETE` | `/api/cart/items/:productId` | auth | remove line item |
| `POST` | `/api/cart/checkout` | auth | create orders from current cart |

Cart checkout behaviors:

- products are resolved from stored product ids
- cart lines are grouped by store
- coupon discounts are prorated across store-specific orders
- shipping is currently `6.99` when subtotal is positive
- tax is currently `8%` of subtotal
- the cart is cleared after successful checkout

Built-in fallback coupon codes recognized even without a database coupon:

- `SAVE10`
- `WELCOME5`
- `FREESHIP`

Important implementation note: `POST /api/cart/checkout` creates orders but does not currently decrement product stock. Inventory decrement happens in the direct checkout endpoint under `/api/orders/checkout`.

### 19.2 Order APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/orders` | auth | list current user's orders |
| `GET` | `/api/orders/:id` | auth | get one owned order |
| `POST` | `/api/orders/checkout` | auth | direct checkout from submitted item payload |
| `POST` | `/api/orders/:id/disputes` | auth | open dispute for owned order |
| `PATCH` | `/api/orders/:id/return-refund-request` | auth | request return or refund |

Direct checkout behaviors:

- accepts explicit `items`
- resolves products by `productId` or title fallback
- supports optional `variantSku`
- validates stock before order creation
- decrements stock after validation
- supports coupon validation and usage limits
- groups created orders by store

### 19.3 Coupon behavior in checkout

Database coupons support:

- `percent`
- `fixed`

The code also contains built-in fallback coupon behavior for free shipping. That means checkout logic is slightly broader than the coupon schema itself.

### 19.4 Disputes

Dispute creation:

- requires an owned order
- prevents duplicate active disputes for the same order by the same customer
- stores reason and optional message
- starts in `open` state

The schema includes a `merchantUserId` field, but the customer-side dispute creation path does not currently populate it.

### 19.5 Returns and refunds

Return or refund requests:

- are only allowed when order status is `delivered`
- record type, reason, details, and timestamps
- start with request status `requested`

## 20. User, Wishlist, and Profile APIs

### 20.1 User profile APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | auth | fetch normalized profile |
| `PATCH` | `/api/users/me` | auth | update profile, preferences, and addresses |
| `DELETE` | `/api/users/me` | auth | delete account and related data |

User profile fields include:

- name
- email
- phone number
- profile image URL
- preferences
- addresses

Address handling is opinionated:

- blank addresses are removed
- only one default address is retained
- if no address is marked default, the first remaining address becomes default

Account deletion is a hard delete. It removes:

- the user
- the user's cart
- the user's wishlist
- the user's orders

There is no soft-delete or restore flow in the current backend.

### 20.2 Wishlist APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/wishlist` | auth | load enriched wishlist |
| `POST` | `/api/wishlist/items` | auth | add product to wishlist |
| `DELETE` | `/api/wishlist/items/:productId` | auth | remove wishlist item |
| `PATCH` | `/api/wishlist/items/:productId/alerts` | auth | toggle alert preferences |

Wishlist items are more than bookmarks. Each item stores:

- alert preferences for price drops and back-in-stock changes
- `lastKnownPrice`
- `lastKnownInStock`

On read, the backend compares current product state with stored snapshots so the frontend can detect meaningful changes.

## 21. Admin API Surface

Every admin endpoint sits under `/api/admin` and first passes through `requireSupportOrAbove`.

### 21.1 Dashboard and growth

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/dashboard` | staff | counts, revenue, stock value, profit, trend, low stock |
| `GET` | `/api/admin/growth` | staff | funnel and engagement metrics |

Dashboard metrics include:

- product count
- category count
- order count
- user count
- total sales
- stock value at cost
- expected profit potential
- realized profit from sales
- 14-day sales trend
- low-stock products

Growth metrics include:

- search session count from `SearchEvent`
- placed and delivered orders
- conversion rate
- fulfillment rate
- average order value
- wishlist intent
- customer totals
- 30-day engagement map

### 21.2 Staff profile

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/profile` | staff | fetch staff profile |
| `PATCH` | `/api/admin/profile` | staff | update name and email |
| `PATCH` | `/api/admin/profile/password` | staff | change password |

### 21.3 Product administration

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/products` | staff | paginated product listing |
| `POST` | `/api/admin/products` | merchant and above | create product |
| `PUT` | `/api/admin/products/:id` | merchant and above | update product |
| `DELETE` | `/api/admin/products/:id` | admin and above | delete product |

Product filters include:

- `category`
- `search`
- `stock=out|low|in`
- `page`
- `limit`

Product write rules:

- category must refer to a valid platform category or fall back to `general`
- up to four images
- up to 30 sizes
- up to 20 hex colors
- status limited to `active` or `draft`
- audit logs are recorded for create, update, and delete

### 21.4 Category administration

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/categories` | staff | list platform categories |
| `POST` | `/api/admin/categories` | admin and above | create category |
| `PUT` | `/api/admin/categories/:id` | admin and above | update category |
| `DELETE` | `/api/admin/categories/:id` | admin and above | delete category |

Category behaviors:

- categories are platform-wide in the current admin implementation
- parent-child hierarchy is supported through `parentId`
- cyclic parent relationships are rejected
- renaming a category updates product documents that still reference the old slug
- deleting a category resets child categories to no parent and reassigns matching products to `general`

### 21.5 Order operations

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/orders` | staff | paginated order listing |
| `GET` | `/api/admin/orders/:id` | staff | order detail |
| `PATCH` | `/api/admin/orders/:id/status` | merchant and above | update status |
| `PATCH` | `/api/admin/orders/:id/shipping` | merchant and above | update shipping data |

Supported order statuses:

- `placed`
- `processing`
- `shipped`
- `delivered`
- `cancelled`

Shipping update payloads can include:

- `courier`
- `trackingNumber`
- `eta`
- an optional timeline `event` object with `label` and `note`

### 21.6 User and merchant administration

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users` | platform admin | user directory |
| `POST` | `/api/admin/users` | admin and above | create user |
| `PATCH` | `/api/admin/users/:id/role` | admin and above | change role |
| `DELETE` | `/api/admin/users/:id` | admin and above | delete user |
| `GET` | `/api/admin/merchants` | admin and above | merchant directory |
| `POST` | `/api/admin/merchants` | admin and above | create merchant and store |
| `PATCH` | `/api/admin/merchants/:id` | admin and above | update merchant store metadata |

User directory behavior:

- unavailable to merchants
- supports `search`
- supports `scope=customers`
- supports `scope=system`
- supports explicit `role`

Deletion protections:

- a staff user cannot delete their own account
- `super_admin` accounts cannot be deleted

When a role is changed to `customer`, the backend ensures a cart and wishlist exist.

### 21.7 Disputes, sales, coupons, and audit logs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/disputes` | staff | dispute queue |
| `PATCH` | `/api/admin/disputes/:id` | staff | update dispute state |
| `GET` | `/api/admin/sales` | staff | sales summary |
| `GET` | `/api/admin/sales/export.csv` | staff | CSV export |
| `GET` | `/api/admin/sales/export.pdf` | staff | PDF export |
| `GET` | `/api/admin/coupons` | staff | coupon list |
| `POST` | `/api/admin/coupons` | merchant and above | create coupon |
| `PUT` | `/api/admin/coupons/:id` | merchant and above | update coupon |
| `DELETE` | `/api/admin/coupons/:id` | admin and above | delete coupon |
| `GET` | `/api/admin/audit-logs` | admin and above | audit trail |

Sales supports:

- optional `from`
- optional `to`
- order count
- gross sales
- average order value
- revenue grouped by status
- top products
- export limits of 2000 rows for CSV and 500 rows for PDF

Coupon behaviors:

- merchants are store-scoped
- admins can operate globally
- audit logs are written for coupon mutations

Audit log filters:

- `action`
- `entityType`

## 22. Data Model and Collections

The backend uses Mongoose schemas in `backend/src/models`.

### 22.1 Users

Purpose: identity, preferences, addresses, and role metadata.

Key fields:

- `name`
- `email` unique
- `phoneNumber`
- `passwordHash`
- `role`
- `profileImageUrl`
- `storeId`
- `preferences`
- `addresses`

Important notes:

- emails are lowercased and unique
- password hashes are stripped from JSON output
- `storeId` links merchants to stores

### 22.2 Stores

Purpose: merchant storefront identity.

Key fields:

- `name`
- `slug` unique
- `ownerUserId`
- `description`
- `logoUrl`
- `isActive`

The unique slug is used heavily in routing and filtering.

### 22.3 Products

Purpose: catalog inventory.

Key fields:

- `title`
- `description`
- `category` slug string
- `storeId`
- `imageUrl`
- `images`
- `costPrice`
- `salePrice`
- `stockQty`
- `status`
- `variants`
- `sizes`
- `colors`
- `reviews`
- `price`

Notable constraints:

- max 4 images
- max 20 colors
- color format must be `#RRGGBB`
- status is `active` or `draft`

### 22.4 Orders

Purpose: completed commercial transactions.

Key fields:

- `userId`
- `storeId`
- `merchantUserId`
- embedded `items`
- `subtotal`
- `shipping`
- `tax`
- `discount`
- `total`
- `couponCode`
- `shippingAddress`
- `shippingDetails`
- `status`
- `returnRefundRequest`

Orders embed line items instead of referencing live product state only. This is the correct choice for preserving commercial history.

### 22.5 Carts

Purpose: server-side pre-checkout basket.

Key fields:

- `userId` unique
- `items[]`
  - `productId`
  - `quantity`

### 22.6 Wishlists

Purpose: customer purchase intent and alert tracking.

Key fields:

- `userId` unique
- `items[]`
  - `productId`
  - alert flags
  - `lastKnownPrice`
  - `lastKnownInStock`

### 22.7 Categories

Purpose: catalog taxonomy.

Key fields:

- `name`
- `slug` unique
- `description`
- `imageUrl`
- `storeId`
- `parentId`

The current admin implementation treats categories as platform-level even though the schema supports `storeId`.

### 22.8 Coupons

Purpose: promotional rules.

Key fields:

- `storeId`
- `code`
- `description`
- `discountType`
- `discountValue`
- `minOrderValue`
- `startsAt`
- `endsAt`
- `maxUses`
- `usesCount`
- `isActive`

Important note: `code` is globally unique at the schema level, even though the route logic often checks for duplicates inside the current store scope. That means two different stores cannot reuse the same coupon code.

### 22.9 Disputes

Purpose: post-purchase issue resolution.

Key fields:

- `orderId`
- `storeId`
- `customerUserId`
- `merchantUserId`
- `reason`
- `message`
- `status`
- `resolutionNote`
- `resolvedByUserId`
- `resolvedAt`

### 22.10 Audit logs

Purpose: governance and traceability.

Key fields:

- `actorId`
- `actorEmail`
- `actorRole`
- `action`
- `entityType`
- `entityId`
- `details`

### 22.11 Search events

Purpose: lightweight growth telemetry.

Key fields:

- `userId`
- `query`
- `category`
- `storeId`
- `inStockOnly`
- `minRating`
- `maxPrice`
- `resultCount`

## 23. Reporting, Analytics, and Audit Logging

Cartify includes several operational reporting layers.

### 23.1 Dashboard metrics

The dashboard endpoint aggregates:

- counts across products, categories, orders, and users
- total sales
- cost-based stock value
- expected margin still sitting in stock
- realized profit from historical sales
- low-stock inventory
- 14-day sales trend

### 23.2 Growth metrics

The growth endpoint combines:

- `SearchEvent`
- `Order`
- `Wishlist`
- `User`
- `Product`

to produce:

- sessions
- wishlist intent
- placed orders
- delivered orders
- conversion rate
- fulfillment rate
- average order value
- 30-day engagement points

These are product signals, not accounting truth. They are useful for trend analysis and operations, not for audited finance.

### 23.3 Sales reporting

Sales reporting provides:

- summary totals
- value by status
- top products by revenue
- CSV export
- PDF export

### 23.4 Audit logging

`logAudit` is invoked after many sensitive admin actions, including:

- product create, update, delete
- category create, update, delete
- order status and shipping updates
- merchant create and update
- dispute updates
- user create, role change, delete
- coupon create, update, delete

Audit logging is best effort. Failures in audit persistence do not block the business action.

## 24. Local Development Guide

### 24.1 Prerequisites

Recommended local prerequisites:

- Node.js LTS
- npm
- MongoDB running locally or a reachable MongoDB URI

### 24.2 Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Set your backend `.env`, then start:

```bash
npm run dev
```

The backend defaults to `http://localhost:4000`.

### 24.3 Frontend setup

```bash
cd Admin
npm install
cp .env.example .env
```

Set:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Start the frontend:

```bash
npm run dev
```

### 24.4 Useful backend scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | start backend with nodemon |
| `npm start` | start backend with node |
| `npm run seed` | replace products with sample seed data |
| `npm run migrate:stores` | run store backfill migration |
| `npm run migrate:order-ownership` | backfill order ownership fields |

### 24.5 Local smoke test sequence

1. Start MongoDB.
2. Start the backend.
3. Open `GET /health` in browser or curl it.
4. Start the frontend.
5. Load the storefront.
6. Create a customer account.
7. Add a product to cart and verify `/api/cart`.
8. Create a merchant account and verify `/api/stores/me`.
9. Enter `/admin` with a staff-capable user.

## 25. Deployment Guide

The two web modules can be deployed independently.

### 25.1 Backend deployment requirements

At minimum, production needs:

- a reachable MongoDB instance
- `MONGODB_URI`
- `JWT_SECRET`
- appropriate role email lists
- HTTPS in front of the API

Recommended deployment characteristics:

- process manager or container orchestration
- structured stdout log capture
- health monitoring against `/health`
- restricted CORS instead of open default behavior

### 25.2 Frontend deployment requirements

The frontend is a static build produced by Vite:

```bash
cd Admin
npm run build
```

Because the app uses `HashRouter`, it is friendly to static hosts without custom rewrite rules.

Required frontend env:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

### 25.3 Production configuration checklist

- set a strong `JWT_SECRET`
- use a production MongoDB cluster
- ensure the frontend points at the correct `/api` base
- tighten CORS allowed origins
- enable TLS everywhere
- verify privileged email lists before launch

## 26. Operations Runbook

### 26.1 Health checks

Primary liveness endpoint:

```http
GET /health
```

Expected response:

```json
{
  "ok": true,
  "service": "cartify-backend"
}
```

### 26.2 Common operational checks

If something looks wrong, these are the fastest checks to run.

#### Users cannot access expected admin pages

Check:

- JWT present in browser local storage
- user role in database
- env email lists that may override role on login

#### Merchant sees no products

Check:

- merchant `storeId`
- product `storeId`
- store `isActive`
- product `status`

#### Product missing from storefront

Check:

- product status is not `draft`
- category filters
- store filters
- `stockQty` if using in-stock filters

#### Checkout fails

Check:

- cart is not empty
- coupon validity
- stock quantities
- product ids still resolve
- MongoDB write availability

#### Growth numbers look surprising

Check:

- `SearchEvent` volume
- whether the storefront is actually posting search telemetry
- order volume and status distribution
- wishlist document sizes

### 26.3 Admin notification behavior

The admin layout polls `/api/admin/orders` every 30 seconds to build recent order notifications. If notifications look stale:

- confirm the polling endpoint responds
- confirm order `createdAt` values are recent
- clear the local storage "last seen" value if needed during testing

### 26.4 Seeding and migrations

Use `npm run seed` only in non-production environments unless you intentionally want to replace the product collection with sample data.

Available one-off migrations:

- `backfillStoreIds.js`
- `backfillOrderOwnership.js`

Review each script before running it in a shared environment.

## 27. Security Notes and Hardening Guidance

The current platform includes several good baseline practices:

- passwords are hashed with bcrypt
- JWT secrets are required
- mutable endpoints use validation middleware
- role checks are enforced server-side
- audit logs exist for many sensitive admin operations

That said, production hardening still has room to improve.

### 27.1 Current security considerations

- the frontend stores JWTs in local storage, so XSS prevention is critical
- CORS is globally open by default
- there is no visible rate limiting layer
- there is no visible refresh token or token rotation flow
- there is no visible CSRF layer, though bearer-token APIs without cookies reduce classic CSRF exposure
- audit logging is best effort, not guaranteed
- some multi-document flows are not wrapped in database transactions

### 27.2 Recommended hardening steps

1. Restrict CORS to trusted frontend origins.
2. Add rate limiting to auth and mutation endpoints.
3. Add security headers such as Helmet.
4. Review frontend XSS exposure carefully because tokens live in local storage.
5. Consider shorter token lifetimes plus refresh-token design if session security needs increase.
6. Add transaction support for multi-step flows like merchant provisioning where appropriate.
7. Add centralized structured logging and alerting.

## 28. Testing and Quality Strategy

The repository currently shows strong application behavior, but the backend and web modules do not include an established automated test suite in this repo.

### 28.1 High-value backend test targets

- auth signup and login
- merchant signup and store creation
- role recalculation by env email mapping
- cart checkout and order splitting
- direct checkout inventory decrement
- duplicate dispute prevention
- delivered-only return or refund requests
- category rename propagation to products
- RBAC boundaries on admin endpoints

### 28.2 High-value frontend test targets

- auth persistence and redirects
- `ProtectedRoute` and `StaffRoute`
- merchant signup fallback endpoint order
- product CRUD forms
- order status and shipping update flows
- user and merchant management
- sales export triggers
- store context propagation through `?store=`

### 28.3 Recommended manual regression checklist

- anonymous storefront browsing
- customer signup and login
- merchant signup and admin access
- product creation, update, and delete
- category rename and delete
- cart checkout
- direct checkout
- order status and shipping update
- coupon create and redeem
- dispute resolution
- sales CSV and PDF export
- audit log visibility

## 29. Known Gaps and Recommendations

This section documents real implementation caveats that future maintainers should know early.

### 29.1 Cart checkout and direct checkout are not fully symmetric

`POST /api/cart/checkout` creates orders but does not decrement stock, while `POST /api/orders/checkout` does decrement stock. That inconsistency can lead to inventory drift if both flows are used in production.

### 29.2 Some analytics are broader than store scope

Merchant-scoped dashboards still count some platform-wide values such as total users. Growth metrics also mix store-aware and global signals. That is acceptable for directional insight but should not be mistaken for strict merchant-isolated analytics.

### 29.3 Coupon uniqueness is global

Although coupons have a `storeId`, the schema makes `code` globally unique. If the product direction expects separate stores to reuse the same code names, the schema will need to change.

### 29.4 Categories are represented by slug strings inside products

This keeps reads simple but increases write-side complexity for category renames and deletes. The backend already handles propagation, but the tradeoff should remain explicit.

### 29.5 Token storage is convenient but high-trust

Local storage is simple for a SPA, but it makes frontend injection vulnerabilities more serious because tokens are directly accessible in the browser runtime.

### 29.6 Audit logging is non-blocking

This is good for availability, but it also means a successful admin action does not guarantee an audit record exists.

### 29.7 There is no soft-delete strategy

User deletion is destructive and removes related data. That may be correct for some environments, but it reduces recovery options and should be reviewed against compliance expectations.

## 30. Conclusion

Cartify's web platform is already more than a basic admin panel. It is a combined commerce and operations system with:

- a real storefront
- a role-aware admin dashboard
- merchant provisioning
- store-scoped operations
- customer cart and order flows
- post-order dispute and return handling
- reporting, exports, and audit trails

From an engineering point of view, its strongest qualities are:

- one coherent backend for all clients
- a practical role model with store scoping
- a browser app that cleanly separates storefront and admin concerns while sharing infrastructure
- a broad operational surface that already resembles a production commerce system

The most important future improvements are consistency, hardening, and test coverage, especially around checkout, inventory, security, and analytics scope.

## 31. Appendix A: Environment Variable Reference

### Backend

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | no | `4000` | backend listen port |
| `NODE_ENV` | no | `development` | runtime mode |
| `MONGODB_URI` | yes | none | MongoDB connection string |
| `JWT_SECRET` | yes | none | signing secret for JWT |
| `JWT_EXPIRES_IN` | no | `7d` | token lifetime |
| `ADMIN_EMAILS` | no | empty | comma-separated admin emails |
| `SUPER_ADMIN_EMAILS` | no | empty | comma-separated super admin emails |
| `MANAGER_EMAILS` | no | empty | comma-separated manager emails |
| `SUPPORT_EMAILS` | no | empty | comma-separated support emails |

### Frontend

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | recommended | Render deployment URL | base URL for Axios API client |

## 32. Appendix B: Endpoint Inventory

### Public and auth

- `GET /health`
- `GET /`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/signup-merchant`
- `POST /api/auth/merchant-signup`
- `POST /api/auth/signup/merchant`

### Products and search

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products/search-events`
- `POST /api/products/:id/reviews`

### Cart

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `POST /api/cart/checkout`

### Orders

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/checkout`
- `POST /api/orders/:id/disputes`
- `PATCH /api/orders/:id/return-refund-request`

### Wishlist

- `GET /api/wishlist`
- `POST /api/wishlist/items`
- `DELETE /api/wishlist/items/:productId`
- `PATCH /api/wishlist/items/:productId/alerts`

### Users

- `GET /api/users/me`
- `PATCH /api/users/me`
- `DELETE /api/users/me`

### Stores

- `GET /api/stores`
- `GET /api/stores/me`
- `PATCH /api/stores/me`
- `GET /stores`

### Admin

- `GET /api/admin/dashboard`
- `GET /api/admin/growth`
- `GET /api/admin/profile`
- `PATCH /api/admin/profile`
- `PATCH /api/admin/profile/password`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status`
- `PATCH /api/admin/orders/:id/shipping`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/merchants`
- `POST /api/admin/merchants`
- `PATCH /api/admin/merchants/:id`
- `GET /api/admin/disputes`
- `PATCH /api/admin/disputes/:id`
- `GET /api/admin/sales`
- `GET /api/admin/sales/export.csv`
- `GET /api/admin/sales/export.pdf`
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`
- `PUT /api/admin/coupons/:id`
- `DELETE /api/admin/coupons/:id`
- `GET /api/admin/audit-logs`

## 33. Appendix C: Page Inventory

| Page component | Route | Audience | Main data dependencies |
| --- | --- | --- | --- |
| `LoginPage` | `/login` | public | `/auth/*` |
| `StoreHomePage` | `/`, `/store/:storeSlug` | customer | `/products`, `/stores` |
| `StoresPage` | `/stores` | customer | `/stores` |
| `StoreProductPage` | `/product/:id` | customer | `/products/:id`, `/cart/items`, `/products/:id/reviews` |
| `StoreCartPage` | `/cart` | authenticated customer | `/cart`, `/cart/checkout` |
| `MyOrdersPage` | `/my-orders` | authenticated customer | `/orders` |
| `StoreProfilePage` | `/profile` | authenticated customer | `/users/me`, `/wishlist` |
| `StoreWishlistPage` | `/wishlist` | authenticated customer | `/wishlist` |
| `HelpSafetyPage` | `/help-safety` | public | static and support content |
| `DashboardPage` | `/admin` | staff | `/admin/dashboard`, `/admin/orders` |
| `ProductsPage` | `/admin/products` | staff | `/admin/products`, `/admin/categories` |
| `CategoriesPage` | `/admin/categories` | staff | `/admin/categories` |
| `OrdersPage` | `/admin/orders` | staff | `/admin/orders`, `/admin/orders/:id` |
| `UsersPage` | `/admin/users` | platform admin | `/admin/users` |
| `MerchantsPage` | `/admin/merchants` | platform admin | `/admin/merchants` |
| `DisputesPage` | `/admin/disputes` | staff | `/admin/disputes` |
| `GrowthDashboardPage` | `/admin/growth` | staff | `/admin/growth` |
| `SalesPage` | `/admin/sales` | staff | `/admin/sales`, export endpoints |
| `CouponsPage` | `/admin/coupons` | staff | `/admin/coupons` |
| `AuditLogsPage` | `/admin/audit-logs` | platform admin | `/admin/audit-logs` |
| `ProfilePage` | `/admin/profile` | staff | `/admin/profile`, `/stores/me` |

## 34. Appendix D: Release Checklist

Use this checklist before a production release of the web platform.

1. Verify MongoDB connectivity in the target environment.
2. Verify `JWT_SECRET` is set and not using placeholder values.
3. Verify `VITE_API_BASE_URL` points to the correct backend `/api`.
4. Confirm CORS configuration matches production frontend origins.
5. Confirm privileged email lists reflect the intended admin staff.
6. Run smoke tests for signup, login, cart, checkout, and admin entry.
7. Verify at least one admin account can access `/admin/users`, `/admin/merchants`, and `/admin/audit-logs`.
8. Verify merchant accounts only see store-scoped products, orders, coupons, and disputes.
9. Verify CSV and PDF sales exports download correctly.
10. Review whether seeding or migration scripts should be disabled or avoided in the release environment.
