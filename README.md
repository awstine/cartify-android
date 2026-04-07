# Cartify Project Documentation

## Table of Contents

1. Introduction
2. Project Vision and Problem Statement
3. Solution Overview
4. Repository Structure
5. Technology Stack
6. High-Level System Architecture
7. End-to-End Runtime Flow
8. Android Application Overview
9. Android Startup and Application Shell
10. Android Navigation Model
11. Android Authentication Flow
12. Android Product Discovery Experience
13. Android Store Mode
14. Android Product Details and Reviews
15. Android Cart Management
16. Android Checkout and Order Placement
17. Android Orders, Wishlist, Profile, Settings, Help, and Growth Screens
18. Android State Management and Local Persistence
19. Android Networking Layer
20. React Admin and Storefront Web Overview
21. Web Authentication and Authorization
22. Storefront Pages in the Web App
23. Staff and Admin Pages in the Web App
24. Backend Overview
25. Backend Configuration and Startup
26. Authentication and Role Model
27. Product APIs
28. Cart APIs
29. Order APIs
30. Wishlist APIs
31. User APIs
32. Store APIs
33. Admin APIs
34. Database Architecture
35. Collection-by-Collection Schema Notes
36. Business Rules and Domain Logic
37. Security Design
38. Error Handling and Resilience
39. Setup, Local Development, and Deployment Notes
40. Testing, Limitations, and Enhancement Opportunities

## 1. Introduction

Cartify is a multi-surface commerce platform composed of a native Android shopping application, a Node.js and Express backend connected to MongoDB, and a React-based web interface that serves both as a storefront and as an internal staff dashboard. The codebase is structured as a single repository with three main modules: `app/` for the Android client, `backend/` for the API and business layer, and `Admin/` for the browser-based management and commerce interface.

The project is not a simple product catalog demo. It includes user authentication, merchant onboarding, store segmentation, product and category management, cart and checkout flows, order lifecycle management, disputes, wishlist alerts, coupon handling, audit logging, sales reporting, and multiple role-based administrative capabilities. The Android client also introduces a local experience layer for analytics, experiments, moderation flags, address book storage, recently viewed tracking, and feature flags. Taken together, Cartify behaves like a marketplace architecture with both centralized platform controls and merchant-scoped operations.

This document explains how the full system works in practice. It covers the business purpose of the platform, the technical architecture, the responsibilities of each module, the mobile and web user journeys, the backend endpoint design, the MongoDB schema design, the role and permission model, and the operational concerns that affect deployment and maintenance.

## 2. Project Vision and Problem Statement

The platform is designed to solve a common digital commerce problem: building a single environment where customers can discover and buy products, merchants can maintain their own stores and catalog entries, and staff or administrators can govern the marketplace. In many commerce systems, customer experience and merchant operations live in separate products with duplicated logic. Cartify reduces that separation by connecting all clients to one backend and one database while still respecting role boundaries and store ownership.

At the customer level, the system focuses on browsing products, exploring stores, saving items to a wishlist, placing orders, tracking order history, and managing personal profile details. At the merchant level, it supports product creation, product updates, store maintenance, fulfillment updates, coupon management, and visibility into sales. At the platform level, it supports categories, user management, merchant provisioning, dispute handling, growth analytics, audit logs, and aggregated dashboards.

The Android client targets the consumer shopping experience. The React web app covers both a public or semi-public storefront mode and an authenticated staff dashboard mode. The backend acts as the central enforcement layer for authentication, authorization, validation, persistence, checkout calculation, and reporting. MongoDB stores all durable business entities, while the Android app also uses local shared preferences for experience-related state that does not need to be synchronized immediately with the server.

## 3. Solution Overview

The repository delivers a marketplace-style commerce system with three cooperating layers. The Android app is written in Kotlin with Jetpack Compose and gives end users a modern mobile shopping interface. The Node.js backend uses Express and Mongoose to expose REST-style APIs, persist commerce data, and enforce role restrictions. The React app, built with Vite and Tailwind, provides browser-based access for both customers and staff users.

The mobile client is connected directly to backend endpoints for authentication, products, stores, wishlist, profile, cart, checkout, and orders. The web app also talks to the same backend and uses a token stored in browser local storage to authorize requests. The backend issues JWT tokens and uses them in middleware to reconstruct the current user identity and role. MongoDB collections represent users, stores, products, carts, wishlists, orders, disputes, categories, coupons, search events, and audit logs.

One of the most important architectural characteristics of Cartify is store scoping. Many platform features are global, but many operational features are restricted to a merchant’s own store. Products, coupons, disputes, and portions of order management all use store-aware query filtering. In effect, the backend is designed to behave as both a marketplace API and a merchant back-office API without requiring separate services.

## 4. Repository Structure

The top-level repository is organized around the three main runtime surfaces. The `app/` directory contains the Android application, including Compose UI screens, repositories, navigation, theme definitions, and backend API bindings. The `backend/` directory contains the Express server, environment configuration, route handlers, Mongoose models, migrations, utilities, and seed logic. The `Admin/` directory contains the React application used for storefront browsing and staff administration. Shared infrastructure files such as Gradle configuration, project settings, and the root documentation live at the repository root.

Within the Android app, source files are arranged into `data`, `domain`, and `ui` packages. The `data` package contains network models, Retrofit services, repositories, and local preference wrappers. The `ui` package contains screens, components, themes, and navigation. The backend organizes logic more conventionally around `config`, `middleware`, `models`, `routes`, `migrations`, and `utils`. The React app is structured around pages, components, context providers, API helpers, and authentication helpers.

This structure keeps each platform self-contained while allowing all three modules to evolve together. The repository therefore behaves as a monorepo for a single product rather than as several unrelated projects.

## 5. Technology Stack

The Android client uses Kotlin, Jetpack Compose, Material 3, Android ViewModel support libraries, Navigation Compose, Retrofit, Gson, OkHttp logging interceptors, Coil for image loading, Kotlin serialization, and SharedPreferences for local persistence. The minimum Android SDK is 26 and the project is configured for compile and target SDK 36.

The backend uses Node.js in ECMAScript module mode, Express for HTTP routing, Mongoose for MongoDB access, `jsonwebtoken` for JWT issuance and verification, `bcryptjs` for password hashing, `express-validator` for request validation, `cors` for cross-origin support, `dotenv` for environment loading, and `pdfkit` for PDF export generation.

The web application uses React 18, React Router, Axios, React Hook Form, Zod, Vite, Tailwind CSS, PostCSS, and Autoprefixer. The web app is intentionally lightweight in its dependency profile and relies heavily on custom pages and reusable UI wrappers.

Across the whole system, MongoDB is the durable data store, JWT tokens are the primary authentication artifact, and REST-style HTTP APIs are the integration contract between frontends and the backend.

## 6. High-Level System Architecture

At a high level, Cartify follows a client-server architecture with multiple clients. The Android application and the React web app act as independent presentation layers. Both send requests to the backend API, which applies authentication, validation, role rules, business logic, and persistence. MongoDB stores the final state of business entities. The backend does not expose GraphQL or event-driven infrastructure in this repository; instead, it relies on direct HTTP request-response patterns.

The server bootstraps by loading environment variables, connecting to MongoDB, and registering route groups under `/api`. The core route groups are authentication, products, cart, orders, wishlist, users, admin, and stores. Each route group is responsible for its own validation and most also rely on middleware such as `requireAuth`, `requireManagerOrAbove`, or `requireAdminOrAbove`.

The Android and web clients both implement their own local experience layer. The mobile client goes further by storing reviews, recently viewed items, analytics counters, address book entries, moderation flags, feature flags, and experiment assignments locally in SharedPreferences. The web client uses browser local storage for auth state and request prefetch caching.

## 7. End-to-End Runtime Flow

A typical customer journey begins when the Android app launches. The app preloads product data and attempts to prefetch store information. Once startup is complete, the user can browse products, open a product detail screen, add items to the local cart, or authenticate if they want to access protected capabilities such as wishlist, checkout, orders, or profile features. Authentication calls the backend `/api/auth/signup` or `/api/auth/login` endpoint and stores the resulting JWT token in the mobile auth state. Once authenticated, the client begins using authorized endpoints such as `/api/wishlist`, `/api/orders`, `/api/users/me`, and `/api/orders/checkout`.

On the web side, a user can browse the storefront, navigate to stores, view products, and open a cart or profile area when authenticated. Staff users with roles such as merchant, support, manager, admin, or super admin are routed into the admin dashboard pages. Every request carries the bearer token once the auth context is established. The web app then uses the admin APIs to load dashboards, manage products, process orders, create coupons, view audit logs, and administer merchants or users depending on permissions.

On the backend, requests are translated into MongoDB queries or updates. Important business workflows include customer signup with cart and wishlist creation, merchant signup with automatic store creation, checkout with store-based order splitting, coupon application, stock decrement logic for direct item checkout, return and refund request submission, dispute lifecycle management, and audit log creation for sensitive admin operations.

## 8. Android Application Overview

The Android application is the primary customer-facing shopping surface in this repository. It is a Compose-first application with one activity, a navigation host, several dedicated screen modules, and repositories that separate remote data access from UI state management. The mobile app presents itself as a shopping interface, but it also includes experience instrumentation and customer account features that resemble a production commerce product rather than a static sample.

The app is bootstrapped in `MainActivity.kt`. It constructs application-scoped preference and repository objects, initializes the cart and product view models, performs startup prefetching, and then mounts the `AppNavHost`. The app theme can be toggled using persisted preferences. Product data is treated as core startup data, while store prefetching is attempted with a time-bounded best-effort strategy.

The Android client contains two parallel ideas of persistence. Durable platform data such as users, orders, stores, and products lives in MongoDB and is fetched through the backend. Experience-level state such as recently viewed items, product text reviews, local analytics counters, address book entries, and feature flags lives in SharedPreferences through `CommerceExperienceRepository`. This gives the app a hybrid offline-friendly behavior for noncritical features.

## 9. Android Startup and Application Shell

At application startup, `MainActivity` initializes `AppPreferences`, `CartRepository`, `ProductRepository`, and `BackendRepository`. It then creates `CartViewModel` and `ProductViewModel` using factories. Inside a `LaunchedEffect`, the app concurrently waits for initial product loading and attempts to retrieve stores from the backend. Product loading is given a larger timeout than store loading because the product feed is foundational to the app experience.

Until startup completes, the UI shows a dedicated loading screen labelled "Preparing app data...". Once ready, the `CartifyTheme` wraps the navigation host. The theme is connected to the dark mode setting stored in preferences, so toggling dark mode affects subsequent app sessions.

The application shell uses `Scaffold` with a bottom navigation bar for the main surfaces. Snackbars are used for feedback such as wishlist actions, review submission results, stock errors, and sync failures. Route-based logic determines whether the bottom bar is shown and whether a bootstrap loading experience should replace the navigation content temporarily.

## 10. Android Navigation Model

Navigation is handled by `AppNavHost` using Navigation Compose. The primary routes include products, categories, wishlist, cart, profile, stores, orders, offers, settings, help, about, checkout, checkout success, login, signup, and product details. There are also dedicated flows for order details and authentication success.

The navigation system is tied closely to auth gating. Rather than simply blocking unauthorized pages, the app uses a pending action mechanism. When a user tries to perform an authenticated action such as adding to wishlist or opening checkout without being logged in, the app stores the intended action and return route. After successful login or signup, the app resumes the original user intent. This creates a smoother commerce experience and reduces friction during conversion flows.

Another notable navigation behavior is route prefetching. When the user navigates to certain routes such as wishlist, cart, orders, or profile, the app proactively asks the backend repository to warm related caches. This helps reduce visible latency for data-heavy destinations and makes navigation feel more responsive.

## 11. Android Authentication Flow

Authentication on Android is driven by `AuthViewModel` and backend calls defined in `BackendApiService`. The supported backend operations are signup and login. Signup sends name, email, and password. Login sends email and password. The response includes a JWT token and a user payload. Merchant signup exists on the backend but is not the primary mobile onboarding flow exposed in the Android source inspected here.

The app uses dedicated login, signup, and auth success screens. If an authenticated action is attempted while unauthenticated, the view model records a `PendingAuthAction`. After login or signup succeeds, the app either returns to the original route or sends the user to a success page if there was no deferred action. This is especially important for commerce actions such as adding to cart from a product page, opening wishlist, or proceeding to checkout.

The JWT token obtained from the backend is then attached to authorized calls via the backend repository. Once logged in, the app begins syncing wishlist data, loading user profile data, and accessing order endpoints. If a token is missing or blank when a protected workflow is triggered, the app surfaces an error or redirects the user through the login path again.

## 12. Android Product Discovery Experience

Product discovery is anchored around `ProductRepository`, `ProductViewModel`, and `ProductScreen`. `ProductRepository` loads products from the backend through `BackendRepository.getProducts()` and converts backend models into UI models. The repository keeps the last successful product list in memory so it can degrade gracefully when network failures occur after an earlier successful fetch.

The product feed supports broad marketplace browsing. Products are loaded from `/api/products` and then transformed from backend IDs into stable integer UI IDs by hashing the MongoDB string identifier. This allows the mobile UI to continue using integer IDs while preserving a link back to the backend object through the `backendId` field.

The app also builds several experience layers on top of the raw product list. It derives category lists from products, derives category cover images from product image collections, tracks recently viewed products, and generates recommendation candidates based on categories the user has viewed. The Android code also filters products locally if they have been blocked in the moderation state stored by `CommerceExperienceRepository`.

## 13. Android Store Mode

One of the distinctive capabilities in the Android app is store mode. Instead of only presenting a flat marketplace, the app can pivot into a store-scoped view where products, categories, and profile affordances are filtered to a single merchant store. Store data is prefetched at startup when possible and can also be loaded on demand.

Store mode is implemented through local state in `AppNavHost`, including `currentStoreSlug`, `currentStoreName`, `currentStoreDescription`, and `storeModeProducts`. When a store is opened, the app fetches products filtered by `storeSlug` using the same backend product endpoint. The UI then uses the store-specific collection as the active product source until the user chooses to return to the broader market.

Several screens are store-aware. Categories show a store banner and a "Back to market" action when the user is inside a store. The profile and other surfaces also display store context and surface retry behavior if store-specific data loading fails. This design lets the same Android shell act as both a marketplace browser and a merchant storefront browser.

## 14. Android Product Details and Reviews

The product details experience is implemented by `ProductDetailsScreen`. It loads the selected product, related products, review content, wishlist state, and order-related affordances. The app supports favorite toggling, add-to-cart, order-now checkout initiation, review submission, and review reporting.

Wishlist state is synchronized with the backend when the user is logged in. If the user toggles the favorite state, the app calls `/api/wishlist/items` or `/api/wishlist/items/:productId` depending on whether the product is being added or removed. The screen then updates a local set of wishlist product IDs for immediate feedback.

Review handling is hybrid. The app can submit a review to the backend using `/api/products/:productId/reviews`, but it also stores text reviews locally through `CommerceExperienceRepository`. If the backend call fails, the app still preserves the review locally and informs the user that the review was saved locally even though server sync failed. This is a resilience-oriented behavior that keeps user effort from being lost.

The details screen also supports review moderation reporting on the client side. Reporting a review adds it to a locally persisted flagged set. Product moderation can also hide products entirely through the blocked product list in local state.

## 15. Android Cart Management

The Android app has both a local cart repository and backend cart endpoints. `CartRepository` persists cart contents in SharedPreferences under the `cartify_cart` preference store. It supports adding items, increasing and decreasing quantity, removing items, clearing the cart, and loading saved cart state on startup.

The current mobile checkout flow relies primarily on local cart contents and then sends a client-side checkout payload to the backend using `/api/orders/checkout`. The app also contains backend cart API bindings such as `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{productId}`, and `DELETE /cart/items/{productId}`, which suggests the platform is designed for or evolving toward richer cart synchronization. The repository already exposes those operations.

From the user perspective, cart interactions are immediate because they are local. Add-to-cart operations happen through the product view model and cart repository. The cart item count is displayed in the navigation shell. The design prioritizes responsiveness on mobile while still allowing the backend to be the final authority at order creation time.

## 16. Android Checkout and Order Placement

Checkout in the Android app is a protected workflow. If a user is not logged in, the app redirects them through authentication and then resumes the checkout attempt. When checkout begins, the app constructs a list of `ClientCheckoutItem` objects from the locally selected cart items and the currently loaded product models. It then calls `BackendRepository.checkoutFromClient`, which posts to `/api/orders/checkout`.

The checkout screen receives pricing numbers through navigation arguments such as subtotal, shipping, tax, discount, and total. For an "order now" flow launched directly from a product details page, the app calculates shipping and tax locally before navigating into the checkout route. The actual authoritative order creation happens on the backend, where items are revalidated, product records are resolved, stock is checked, coupons are validated, and store-based orders are created.

After successful checkout, the app records a local analytics event, clears the local cart, and navigates to a dedicated checkout success screen. If an error occurs during order placement, the checkout screen surfaces a friendly message such as "Unable to place order." The backend response includes a summary object, so the client can align user-visible totals with server-generated results.

## 17. Android Orders, Wishlist, Profile, Settings, Help, and Growth Screens

The Android app contains a large supporting surface area beyond the product feed. The orders screen loads authenticated order history. Order details render the lifecycle status, item breakdown, invoice rows, and reorder capability. The code also includes helper logic for estimated delivery dates and whether an order is cancelable based on how recently it was created.

The wishlist screen uses backend data to display saved products, alert settings, and stock or price change indicators. The server tracks the last known price and stock state for wishlist items, which allows alert-state computation such as price drops or back-in-stock detection.

The profile screen merges remote profile information with local convenience shortcuts. It presents profile details, login or logout actions, navigation into wishlist and stores, and order shortcuts. It also shows a "Products For You" feed based on available product data and local personalization context.

The settings screen is heavily local-experience oriented. It supports low data mode toggling, a local account security panel, password reset request recording, simulated email verification, session revocation, and a locally stored address book. The help screen includes support tracking and local moderation actions such as flagging or blocking products. The offers screen acts as a growth dashboard by rendering locally tracked analytics counters and exposing feature flag switches. The about screen provides a static application identity summary.

## 18. Android State Management and Local Persistence

State in the Android application is distributed across view models, repositories, and Compose state. Remote data state is handled through repositories such as `BackendRepository` and `ProductRepository`, with view models exposing Compose-friendly flows. Local behavior-oriented state is persisted through SharedPreferences wrappers such as `AppPreferences`, `CartRepository`, and `CommerceExperienceRepository`.

`AppPreferences` stores dark mode and notification settings. `CartRepository` stores cart line items. `CommerceExperienceRepository` stores product text reviews, wishlist alert preferences, address book entries, analytics counters, recently viewed products, return request identifiers, low data mode state, account security state, moderation state, feature flags, and experiment assignments. This repository exposes these values as `StateFlow`, which makes them easy to consume in Compose.

This approach gives the application several useful properties. It supports immediate UI updates without requiring every change to round-trip through the backend. It also reduces the risk of losing user context during transient network failures. The tradeoff is that some data exists only locally and therefore is not automatically consistent across devices.

## 19. Android Networking Layer

The Android networking layer is defined under `app/src/main/java/com/cartify/data/remote/backend`. `BackendApiService` contains the Retrofit interface, `BackendModels.kt` contains request and response data classes, and `BackendRepository` wraps the raw service calls with convenience methods and lightweight in-memory caching.

The base URL is injected through `BuildConfig.BACKEND_BASE_URL`, which is configured in `app/build.gradle.kts`. If not supplied via `local.properties` or a Gradle property, it defaults to `https://ecommerce-adroid-app-backend.onrender.com/api/`. This makes the mobile client environment-aware and allows local or hosted backends to be swapped without code changes.

`BackendRepository` caches wishlist, orders, profile, cart, products, and store responses with a one-minute TTL. It can also return stale cache data if a network call fails after a successful previous response. This is an important resilience feature because it helps keep the mobile app usable during intermittent network conditions.

## 20. React Admin and Storefront Web Overview

The `Admin/` module is more than a pure admin console. It contains both public or customer-facing storefront routes and staff-only admin routes. The application uses React Router to separate those experiences while keeping them in one frontend codebase. It is therefore best understood as a commerce web shell with dual modes.

The public side includes routes for the home page, store listing, individual store view, product page, cart, customer orders, profile, wishlist, and a help and safety page. The protected side includes dashboards and CRUD screens for staff users. Route wrappers such as `ProtectedRoute` and `StaffRoute` enforce whether a user must simply be logged in or must also have a staff-capable role.

Because the frontend relies on the same backend as the Android app, both mobile and web experiences share authentication semantics, product and order data, role definitions, and overall business rules. This reduces duplication and means platform changes can generally be implemented once at the backend layer.

## 21. Web Authentication and Authorization

The React app stores auth state under the `cartify_admin_auth` key in browser local storage. The auth context loads that state on startup, injects the token into the Axios client, and persists updated state whenever a user logs in, signs up, signs up as a merchant, or logs out.

Login uses `POST /auth/login`. Standard signup uses `POST /auth/signup`. Merchant signup is more flexible and tries multiple endpoint aliases in order: `/auth/signup-merchant`, `/auth/merchant-signup`, and `/auth/signup/merchant`. This suggests the frontend was designed to remain compatible with older or alternative backend path conventions.

Staff access is defined by role membership. The web app recognizes `merchant`, `support`, `manager`, `admin`, and `super_admin` as staff roles. Protected admin routes are only accessible when the current auth state indicates one of those roles. Purely customer-only routes such as profile and wishlist will redirect staff users toward admin profile views instead of the storefront equivalents.

## 22. Storefront Pages in the Web App

The web app includes a storefront shell through `StoreLayout`. The home page and store pages allow browsing the marketplace and individual merchant offerings. Product pages present item-specific details. The cart, my orders, profile, and wishlist routes require authentication for nonstaff users. The help and safety page is accessible in the storefront mode as well.

The storefront pages are important because they show that Cartify is not implemented as "mobile app for customers and web app for staff only." The browser-based interface is also a customer channel. This increases the product reach of the platform and provides a second consumer surface tied to the same business entities.

The dual-purpose design also influences backend route design. A single API layer must support both mobile and web customers, both web merchants and platform staff, and operational features such as reporting and dispute resolution.

## 23. Staff and Admin Pages in the Web App

The admin portion of the web app includes a dashboard, products page, categories page, orders page, users page, merchants page, disputes page, growth dashboard, sales page, coupons page, audit logs page, and profile page. These map closely to the `/api/admin` route set in the backend.

The dashboard summarizes counts and profitability-related metrics. The products page supports listing and managing inventory. Categories allow platform-level catalog taxonomy maintenance. Orders support operational status changes and shipping updates. Users and merchants provide directory and provisioning functions. Disputes expose post-order support workflows. Sales supports summarized performance views and export. Coupons support promotion management. Audit logs support governance and traceability.

The presence of merchant-focused capabilities inside the same admin shell is especially important. Merchants are treated as staff users, but their scope is more limited than that of platform admins. Many backend queries enforce that a merchant can only act on their own store’s records.

## 24. Backend Overview

The backend is a REST-style Express application that exposes the Cartify business domain over JSON APIs. It sets up CORS, accepts JSON payloads up to 10 MB, exposes a `/health` endpoint, and mounts route groups under `/api`. It also exposes store routes under both `/api/stores` and `/stores`, likely for compatibility with different client expectations.

The server starts only after MongoDB connectivity succeeds. In development mode it will try additional ports if the default is already in use. This small but practical behavior helps reduce friction during local development.

The backend centralizes the platform’s business rules. It is responsible for hashing passwords, issuing JWTs, validating request bodies, enforcing access control, creating carts and wishlists for new customers, creating stores for new merchants, validating category usage during product writes, splitting orders by store, updating stock, validating coupons, recording disputes, and writing audit logs for sensitive staff actions.

## 25. Backend Configuration and Startup

Environment variables are loaded through `dotenv` and validated in `backend/src/config/env.js`. The backend requires `MONGODB_URI` and `JWT_SECRET`. It also accepts `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN`, and comma-separated role mapping lists for `ADMIN_EMAILS`, `SUPER_ADMIN_EMAILS`, `MANAGER_EMAILS`, and `SUPPORT_EMAILS`.

This email list design is significant because role resolution is partly configuration-driven. When a user logs in, the backend recalculates what role they should have based on their email address and these environment variables. That means platform role assignment can be influenced operationally without directly editing database records for every case.

MongoDB connectivity is managed through Mongoose with a server selection timeout. If the connection fails, the server process exits rather than running in a broken partial state. This is the correct operational choice for an API that depends entirely on its database.

## 26. Authentication and Role Model

Cartify supports six primary roles in the `User` model: `customer`, `merchant`, `support`, `manager`, `admin`, and `super_admin`. Customers are standard buyers. Merchants own stores and manage store-scoped operations. Support users can access support-level tools. Managers gain broader operational access. Admins and super admins hold platform-wide powers, with super admins representing the highest control level.

Authentication is JWT-based. During signup or login, the server issues a token containing the user email, role, and optional store ID. The subject of the token is the user ID. The `requireAuth` middleware validates the token and reconstructs a `req.user` object. Higher-level middleware then reloads the user record and enforces allowed roles.

The admin middleware differentiates between several permission levels. `requireSupportOrAbove` allows merchant and above roles into the admin route group. `requireManagerOrAbove` is used for actions like creating or updating products and coupons and changing order state. `requireAdminOrAbove` is used for more sensitive actions like deleting products, deleting categories, managing merchants, or deleting users. `requireSuperAdmin` is available for top-level restrictions even though not every route uses it directly.

## 27. Product APIs

The product route group exposes public product listing and detail retrieval plus authenticated review submission and search-event recording. `GET /api/products` supports filtering by `storeId`, `storeSlug`, `category`, `search`, `inStock`, `includeDrafts`, `minRating`, and `maxPrice`. The route first constructs a MongoDB query, then applies some additional filtering in memory, especially for rating and max-price checks.

`GET /api/products/:id` returns a single product and, when possible, enriches it with a compact store object containing name, slug, description, and logo. This makes product details more informative without forcing the client to perform a second store lookup.

`POST /api/products/search-events` records search telemetry in the `SearchEvent` collection. `POST /api/products/:id/reviews` requires authentication and either creates or replaces the current user’s review entry for that product. Review submissions include a rating and optional comment and are stored inside the product document itself.

## 28. Cart APIs

The cart route group is fully authenticated. `GET /api/cart` returns the current user’s cart and enriches each line item with product and store details where the product still exists. `POST /api/cart/items` adds an item or increases quantity if it already exists. `PATCH /api/cart/items/:productId` applies a quantity delta rather than setting an absolute quantity. `DELETE /api/cart/items/:productId` removes a line item.

`POST /api/cart/checkout` creates orders from the current persisted server-side cart. It loads products, groups order items by store, applies coupon rules, calculates shipping, tax, and proportional discount per store order, creates one or more `Order` documents, increments coupon usage if necessary, clears the cart, and returns a grand summary.

The cart checkout route is distinct from the direct client checkout route under `/api/orders/checkout`. The existence of both paths gives the platform flexibility: one path builds an order from the server-side cart state, and the other builds an order directly from a client-provided item list.

## 29. Order APIs

Order APIs are authenticated and customer-scoped on the standard route group. `GET /api/orders` returns the current user’s orders sorted by recency. `GET /api/orders/:id` returns a specific order if it belongs to the current user.

`POST /api/orders/checkout` allows direct order creation from a client-supplied list of items. The backend resolves products from product IDs or, as a fallback, product titles. It validates stock, validates coupon eligibility and timing, calculates subtotal, shipping, tax, and discount, decrements stock, increments coupon usage, groups items by store, creates one or more orders, and returns a grand summary.

There are also post-order workflows. `POST /api/orders/:id/disputes` opens a dispute for an order if no active dispute already exists. `PATCH /api/orders/:id/return-refund-request` lets a customer request a return or refund for a delivered order. These workflows show that Cartify is designed with after-sales operations in mind, not only purchase conversion.

## 30. Wishlist APIs

Wishlist support is fully authenticated. `GET /api/wishlist` returns the user’s wishlist, normalizes stored item structure, enriches each entry with product and store data, and updates last-known price and stock snapshots so future alert-state calculations remain meaningful.

`POST /api/wishlist/items` adds a product to the wishlist if it is not already present. `DELETE /api/wishlist/items/:productId` removes it. `PATCH /api/wishlist/items/:productId/alerts` lets the client toggle alert preferences for price-drop and back-in-stock notifications.

The wishlist design is more advanced than a simple saved-products list. Each item stores alert preferences and remembers previous price and stock state. This allows the system to determine whether a meaningful state transition has occurred, such as a product becoming cheaper or returning to stock after previously being unavailable.

## 31. User APIs

The user route group is authenticated and focused on self-service account management. `GET /api/users/me` returns a normalized user profile that includes name, email, phone number, profile image URL, preference flags, addresses, and creation timestamp. `PATCH /api/users/me` allows updates to profile fields, preferences, and the address array.

The address update behavior deserves attention. When addresses are supplied, the backend normalizes them, removes entries without a primary line, ensures only one default address remains, and promotes the first address to default if none are explicitly marked as default. This prevents inconsistent profile state.

`DELETE /api/users/me` deletes the account and related cart, wishlist, and order data. This is a strong operation and currently appears to perform hard deletion rather than soft deletion, which is important to understand from both compliance and recovery perspectives.

## 32. Store APIs

The store route group supports public listing and authenticated self-management. `GET /api/stores` lists stores and supports filtering inactive stores out by default. It also supports a keyword search across name, slug, and description. `GET /api/stores/me` returns the authenticated user’s store if they have one. `PATCH /api/stores/me` lets the authenticated store owner update the store name, description, and logo URL.

Store operations are important because they connect merchants to products and many admin-scoped features. The store slug is especially important since both Android and web clients use it as a stable routing and filtering identifier.

The backend also mounts store routes at `/stores` in addition to `/api/stores`. This provides compatibility with clients or links that expect store routes at the root path instead of the API namespace.

## 33. Admin APIs

The admin route group is the richest part of the backend. It begins with `requireSupportOrAbove`, so every request requires an authenticated staff-capable user. The route group supports operational dashboards, growth metrics, profile management, password changes, products, categories, orders, shipping, users, merchants, disputes, sales reports, coupon management, and audit log retrieval.

The dashboard endpoint returns product, category, order, and user counts; total sales; low-stock products; sales trend data for the last 14 days; stock value at cost; expected profit potential; and realized profit from sales. The growth endpoint analyzes search events, orders, wishlist volume, and product count to produce funnel and engagement metrics across the last 30 days.

The product endpoints allow paginated listing, filtered listing, creation, update, and deletion. Product writes validate category usage against platform-level categories. Category endpoints are platform-admin restricted for writes and preserve referential consistency by updating products when category slugs change or when categories are deleted. Order endpoints support listing, detail retrieval, status changes, and shipping timeline updates. User endpoints support directory browsing, user creation, role changes, and deletion with protections such as preventing self-deletion and protecting super admin accounts. Merchant endpoints let platform admins provision merchants with associated stores and modify store state later.

Sales endpoints expose summary analytics plus CSV and PDF export. Coupon endpoints support listing, creation, update, and deletion within the appropriate store scope. Audit log retrieval is restricted to admin and above and supports filtering by action and entity type.

## 34. Database Architecture

MongoDB is the system of record for all primary commerce and administration entities. Mongoose models define schemas, validation rules, indexes, and some transformation behavior such as removing password hashes from serialized user output. The database architecture is document-oriented and intentionally denormalized in some places, particularly for order items and product reviews, to simplify reads and preserve historical state.

The main collections are `users`, `stores`, `products`, `orders`, `carts`, `wishlists`, `categories`, `coupons`, `disputes`, `auditlogs`, and `searchevents`. Relationships are represented mostly by ObjectId references, but the system also stores snapshots inside embedded arrays where immutability or historical accuracy matters. For example, orders embed order items rather than pointing only to products, because product details can change after purchase and the order record still needs to reflect what was sold.

The database design supports both marketplace-level reporting and store-level operations. Several entities, including products, categories, coupons, orders, and disputes, can be scoped to a store. Orders can also include a `merchantUserId`, which helps support merchant-centric filtering and ownership checks even if store linkage is partial or evolving.

## 35. Collection-by-Collection Schema Notes

### Users

The `User` collection stores identity and account settings. Key fields include `name`, `email`, `phoneNumber`, `passwordHash`, `role`, `profileImageUrl`, `storeId`, `preferences`, and `addresses`. Preferences include notification, dark mode, and low data mode flags. Addresses are embedded documents with labels, recipient information, location lines, and a default marker. The email field is unique and indexed. The role field is indexed because it drives permission filtering.

### Stores

The `Store` collection stores merchant storefront identity. Fields include `name`, `slug`, `ownerUserId`, `description`, `logoUrl`, and `isActive`. The slug is unique and indexed, making it safe for routing and filtering. `ownerUserId` links the store to its merchant account.

### Products

The `Product` collection stores catalog entries. Key fields include `title`, `description`, `category`, `storeId`, `imageUrl`, `images`, `costPrice`, `salePrice`, `stockQty`, `status`, `variants`, `sizes`, `colors`, `reviews`, and `price`. Products can belong to a store or exist as marketplace-level items. Reviews are embedded, and colors are validated as hex values. Images are limited to four entries. The status allows active or draft behavior.

### Orders

The `Order` collection captures completed checkout output. Fields include `userId`, `storeId`, `merchantUserId`, `items`, `subtotal`, `shipping`, `tax`, `discount`, `total`, `couponCode`, `shippingAddress`, `shippingDetails`, `status`, and `returnRefundRequest`. Items embed title, image, quantity, price, totals, and optional product, store, or merchant identifiers. Shipping details also include a timeline array, which supports multi-step fulfillment history.

### Carts

The `Cart` collection is a simple per-user document containing a unique `userId` and an array of items. Each item contains a `productId` and `quantity`. This is the backend representation of a server-side cart. The Android app also has a separate local cart store, so backend carts are most relevant when clients actively use the cart API route group.

### Wishlists

The `Wishlist` collection stores one document per user. Each document contains embedded items with `productId`, alert preferences, `lastKnownPrice`, and `lastKnownInStock`. This supports richer wishlist behavior than a simple bookmark list because the system can detect state transitions relevant to user alerts.

### Categories

The `Category` collection stores the platform taxonomy. Fields include `name`, `slug`, `description`, `imageUrl`, `storeId`, and `parentId`. In the current admin implementation, category write operations focus on platform categories where `storeId` is null, and product.category stores the slug string instead of an ObjectId reference. The schema also supports hierarchical relationships through `parentId`.

### Coupons

The `Coupon` collection stores promotional rules. Fields include `storeId`, `code`, `description`, `discountType`, `discountValue`, `minOrderValue`, `startsAt`, `endsAt`, `maxUses`, `usesCount`, and `isActive`. Coupons can be global or store-specific depending on store scope. The system also supports fallback hardcoded coupon codes for common promotions.

### Disputes

The `Dispute` collection represents customer-service disputes tied to orders. Fields include `orderId`, `storeId`, `customerUserId`, `merchantUserId`, `reason`, `message`, `status`, `resolutionNote`, `resolvedByUserId`, and `resolvedAt`. Status values cover open, in review, resolved, and rejected states.

### Audit Logs

The `AuditLog` collection is a governance and observability layer for sensitive admin actions. Each record stores the actor ID, actor email, actor role, action key, entity type, entity ID, and arbitrary details. This supports traceability across CRUD and operational changes.

### Search Events

The `SearchEvent` collection stores product-search telemetry. Fields include `userId`, `query`, `category`, `storeId`, `inStockOnly`, `minRating`, `maxPrice`, and `resultCount`. These events are later used by the growth dashboard to estimate sessions and funnel behavior.

## 36. Business Rules and Domain Logic

Several important business rules shape Cartify’s runtime behavior. First, new customer signup automatically provisions an empty cart and wishlist. This ensures downstream features can assume these documents exist or can be created lazily if absent. Merchant signup automatically creates a store and binds the merchant account to it through `storeId`.

Second, checkout is store-aware. Whether checkout begins from the persisted cart or from a client-provided list of items, the backend groups items by store and creates one order per store bucket. This is crucial for a marketplace model because shipping, merchant fulfillment, reporting, and access control all become easier when store-specific order slices are preserved.

Third, product category assignment in admin product creation and updates is limited to valid platform categories. This prevents arbitrary or misspelled category slugs from polluting the catalog taxonomy. When categories are renamed, products using the old category slug are migrated to the new slug. When a category is deleted, products pointing to it are reassigned to `general`.

Fourth, coupons are validated against minimum order value and, for persisted coupons, also against activation state, start and end dates, and usage limits. The backend supports both database-stored coupons and fallback built-in coupon codes such as `SAVE10`, `WELCOME5`, and `FREESHIP`.

Fifth, return and refund requests are restricted to delivered orders. Disputes cannot be duplicated when there is already an open or in-review dispute for the same order by the same customer. These rules keep after-sales workflows logically consistent.

## 37. Security Design

Security in Cartify begins with credential handling. Passwords are hashed using bcrypt before being stored. Plaintext passwords are never persisted in the database. Tokens are signed using a secret from the environment, not from source code. Missing environment secrets prevent the backend from starting.

Route protection is layered. Basic authentication is handled through bearer tokens. Higher-value operations are protected with role-based middleware that queries the current user record instead of trusting only the JWT payload. This is important because it allows role changes made in the database to take effect even for users who already possess a token.

The system also includes several governance-oriented security behaviors. Admin actions can be audited. Super admin deletion is blocked. Staff users cannot delete themselves through the admin user delete endpoint. Platform-only operations such as merchant management are explicitly gated to `admin` and `super_admin`.

There are still some security considerations worth tracking. The mobile app stores local experience data in SharedPreferences rather than encrypted storage. The web app stores auth state in local storage. These are common design decisions for many prototypes and internal tools, but stronger storage strategies may be desirable for a hardened production deployment.

## 38. Error Handling and Resilience

The backend uses explicit validation for most write endpoints through `express-validator`. Invalid payloads usually return status 400 with a `"Validation failed"` message and the validator error array. ObjectId validity checks are performed before many record lookups, reducing unnecessary database work and avoiding ambiguous errors.

The Android client is designed to keep the UI usable even when some remote calls fail. Product loading retains the last good response in memory. Backend repository methods cache recent responses for profile, orders, wishlist, cart, products, and stores. Some interactions, such as review submission, preserve user input locally even if server sync fails.

The React app includes request progress tracking and a lightweight prefetch cache for GET requests. This improves perceived responsiveness and avoids redundant API calls during route transitions. On the backend, audit logging is deliberately nonblocking; failures in writing audit records do not break the main business flow.

## 39. Setup, Local Development, and Deployment Notes

To run the backend locally, create `backend/.env` with at least `MONGODB_URI` and `JWT_SECRET`. Optionally define `PORT`, `JWT_EXPIRES_IN`, and the role assignment email lists. Then run `npm install` and `npm run dev` inside `backend/`.

To run the Android app, open the project in Android Studio, ensure `local.properties` provides `BACKEND_BASE_URL` if you want to override the default hosted backend, sync Gradle, and run the `app` module. The app already supports environment injection of the backend base URL through Gradle build config.

To run the web app, install dependencies in `Admin/`, define `VITE_API_BASE_URL` if needed, and start Vite. The React app defaults to `https://ecommerce-adroid-app-backend.onrender.com/api` if no environment override is supplied.

Deployment can be split by module. The backend is already wired for a hosted environment through environment variables and a hosted base URL. The web app can be deployed as a static bundle. The Android app can point either to local backend infrastructure or to a hosted API environment. Since all clients rely on the same backend contract, version coordination matters when changing endpoints or response shapes.

## 40. Testing, Limitations, and Enhancement Opportunities

The repository includes Android unit and instrumentation tests such as `CheckoutCalculationsTest`, `ProductInteractionUtilsTest`, and checkout screen tests. These indicate that at least some business and UI behaviors in the Android layer have test coverage. The backend and React app do not currently expose a similarly visible automated test suite in the inspected repository layout, which means those layers may rely more heavily on manual verification at present.

There are also some architectural limitations visible in the current code. The Android app maintains a local cart while the backend also supports a server cart, so there is an overlap of responsibility that should be clarified long term. Some mobile settings and moderation flows are local-only and do not yet appear to synchronize with the backend. The order checkout route can resolve products by title when product IDs are missing, which is convenient but weaker than strict identifier-based resolution. The account delete route performs hard deletions, which may or may not align with future retention requirements.

Despite those limitations, the project is already comprehensive. It implements a real multi-role commerce domain, separate customer and staff experiences, a broad backend surface, and a reasonably rich database model. The most natural enhancement directions would be stronger automated testing for backend and web flows, clearer unification of local versus server cart ownership, improved encryption or secure storage for sensitive client-side state, richer payment and shipment integrations, and broader observability around operational events.

## API Endpoint Summary

The following list summarizes the most important backend endpoints exposed by the current implementation.

### Public and Customer Endpoints

- `GET /health`: backend health probe.
- `GET /`: backend root information.
- `POST /api/auth/signup`: customer signup.
- `POST /api/auth/login`: user login.
- `POST /api/auth/signup-merchant`: merchant signup.
- `POST /api/auth/merchant-signup`: merchant signup alias.
- `POST /api/auth/signup/merchant`: merchant signup alias.
- `GET /api/products`: product listing with filters.
- `GET /api/products/:id`: single product with store details.
- `POST /api/products/search-events`: search analytics event creation.
- `POST /api/products/:id/reviews`: authenticated review upsert.
- `GET /api/cart`: authenticated cart read.
- `POST /api/cart/items`: add cart item.
- `PATCH /api/cart/items/:productId`: change cart quantity by delta.
- `DELETE /api/cart/items/:productId`: remove cart item.
- `POST /api/cart/checkout`: checkout from server cart.
- `GET /api/orders`: current user orders.
- `GET /api/orders/:id`: single current user order.
- `POST /api/orders/checkout`: direct checkout from client-provided items.
- `POST /api/orders/:id/disputes`: open dispute.
- `PATCH /api/orders/:id/return-refund-request`: request return or refund.
- `GET /api/wishlist`: get wishlist.
- `POST /api/wishlist/items`: add wishlist item.
- `DELETE /api/wishlist/items/:productId`: remove wishlist item.
- `PATCH /api/wishlist/items/:productId/alerts`: update wishlist alert preferences.
- `GET /api/users/me`: current user profile.
- `PATCH /api/users/me`: update profile, preferences, and addresses.
- `DELETE /api/users/me`: delete current user account.
- `GET /api/stores`: list stores.
- `GET /api/stores/me`: current user store.
- `PATCH /api/stores/me`: update current user store.
- `GET /stores`: store listing alias.

### Staff and Admin Endpoints

- `GET /api/admin/dashboard`: operational dashboard.
- `GET /api/admin/growth`: growth and funnel metrics.
- `GET /api/admin/profile`: current staff profile.
- `PATCH /api/admin/profile`: update staff profile.
- `PATCH /api/admin/profile/password`: update staff password.
- `GET /api/admin/products`: paginated product management list.
- `POST /api/admin/products`: create product.
- `PUT /api/admin/products/:id`: update product.
- `DELETE /api/admin/products/:id`: delete product.
- `GET /api/admin/categories`: list platform categories.
- `POST /api/admin/categories`: create category.
- `PUT /api/admin/categories/:id`: update category.
- `DELETE /api/admin/categories/:id`: delete category.
- `GET /api/admin/orders`: paginated order list.
- `GET /api/admin/orders/:id`: order details.
- `PATCH /api/admin/orders/:id/status`: update order status.
- `PATCH /api/admin/orders/:id/shipping`: update shipment data and timeline.
- `GET /api/admin/users`: user directory.
- `POST /api/admin/users`: create user.
- `PATCH /api/admin/users/:id/role`: change user role.
- `DELETE /api/admin/users/:id`: delete user.
- `GET /api/admin/merchants`: merchant directory.
- `POST /api/admin/merchants`: create merchant and store.
- `PATCH /api/admin/merchants/:id`: update merchant store state.
- `GET /api/admin/disputes`: dispute list.
- `PATCH /api/admin/disputes/:id`: update dispute resolution state.
- `GET /api/admin/sales`: sales summary.
- `GET /api/admin/sales/export.csv`: CSV sales export.
- `GET /api/admin/sales/export.pdf`: PDF sales export.
- `GET /api/admin/coupons`: coupon list.
- `POST /api/admin/coupons`: create coupon.
- `PUT /api/admin/coupons/:id`: update coupon.
- `DELETE /api/admin/coupons/:id`: delete coupon.
- `GET /api/admin/audit-logs`: audit log list.

## Conclusion

Cartify is already a full-stack commerce platform rather than a single mobile application. Its Android app provides a strong consumer shopping experience, its React app covers both storefront and staff workflows, and its backend enforces the marketplace domain with JWT-based authentication, role-aware access control, and MongoDB-backed persistence. The repository shows a clear effort to support real operational flows such as merchant provisioning, low-stock monitoring, coupon usage, disputes, exports, order fulfillment, and auditability.

From an engineering perspective, the strongest qualities of the project are its coherent domain coverage, its separation of mobile, web, and backend concerns, and its role-aware backend design. The main areas to refine over time are cross-client state consistency, additional automated testing in the backend and web layers, and stronger production-grade security hardening for client-side storage. Even with those future improvements in mind, the current implementation already forms a solid foundation for a multi-role commerce product.

## Appendix A: Detailed Android Screen Catalog

The Android navigation graph is broad enough that it is useful to describe the user-facing role of each major screen independently. The products screen is the primary feed and acts as the home surface of the app. It is responsible for browsing, category filtering, store-aware inventory presentation, recently viewed content, and entry into product detail pages. It also exposes authentication prompts when a user wants to take a protected action before signing in.

The categories screen is effectively a category browser and quick taxonomy explorer. It derives its content from the loaded product data instead of requesting a dedicated category endpoint from the backend. This means its behavior reflects the currently visible product set, which is especially useful in store mode because categories automatically become store-specific without requiring another API surface.

The stores screen introduces marketplace segmentation by merchant. Instead of treating the catalog as one giant undifferentiated inventory pool, the app allows customers to browse active stores and then pivot the surrounding experience into that store’s context. This reinforces merchant identity and allows the platform to scale from a single-vendor application into a multi-vendor marketplace without changing the core navigation shell.

The wishlist screen is positioned as a personalized holding area for purchase intent. It is useful for delayed conversion, price monitoring, and inventory return scenarios. Because wishlist items track alert preferences and last-known price and stock state, the screen can evolve into a stronger retention feature later without requiring a schema redesign.

The cart screen works as the mobile staging area before checkout. Since the current implementation keeps cart state locally, it offers very fast quantity manipulation and immediate totals behavior. This also means that the cart screen is an important part of the user experience even before server-side cart synchronization becomes the dominant model.

The checkout screen is a transactional confirmation surface. It receives totals, validates that the user is logged in, initiates server-side order creation, and then transitions into a checkout success view when order placement succeeds. The checkout success screen closes the conversion loop and gives the user a clear terminal state for the purchase flow.

The orders screen is a post-purchase archive and tracking surface. It gives customers a way to verify purchase history and re-enter specific order details. The order details screen extends this by rendering lifecycle progress, line items, totals, and reorder affordances. Even in its current state, it establishes the structure needed for richer shipment tracking, cancellation windows, and post-purchase service flows.

The profile screen functions both as an account page and as a lightweight customer hub. It exposes identity information, links into personal content such as wishlist and orders, and a product feed for continued exploration. This blended design helps reduce dead-end navigation because the profile area still encourages discovery and shopping activity.

The settings screen consolidates state that is either personal or device-local. It is where low-data mode, address book management, and account security actions are surfaced. The help screen is more operational; it supports support interactions and moderation-oriented actions. The offers screen is best understood as a client-side experimentation and growth diagnostics surface, useful during product iteration and testing. The about screen provides a simple informational endpoint within the app.

## Appendix B: Detailed Web Page Catalog

The React application uses route composition to separate storefront and staff experiences, but the page inventory is worth reviewing because it shows the intended breadth of the platform. `StoreHomePage` functions as the public-facing market landing page in the browser. It presents the store or marketplace shopping surface and serves as an entry point for users who prefer desktop browsing or who discover the platform through links rather than mobile installation.

`StoresPage` lists available stores and supports exploration by merchant identity. `StoreProductPage` presents individual products in a web context. `StoreCartPage`, `MyOrdersPage`, `StoreProfilePage`, and `StoreWishlistPage` replicate core customer account and shopping tasks in the browser. `HelpSafetyPage` rounds out the customer-facing route set with a support or trust-oriented page.

On the staff side, `DashboardPage` presents top-level operational metrics. `ProductsPage` and `CategoriesPage` provide catalog administration. `OrdersPage` exposes fulfillment and status management. `UsersPage` and `MerchantsPage` support identity and store administration. `DisputesPage` covers post-purchase conflict handling. `GrowthDashboardPage` exposes engagement and funnel-oriented metrics derived from search and order behavior. `SalesPage` focuses on revenue reporting and exports. `CouponsPage` supports promotion management. `AuditLogsPage` provides a governance and accountability surface. `ProfilePage` allows staff users to view and manage their own profile details.

This layout confirms that the web app is intended for both commerce and operations. It is not only a customer site and not only a back-office dashboard. That dual role is one of the defining characteristics of the repository.

## Appendix C: Request Lifecycle Examples

One of the clearest ways to understand Cartify is to follow a few request lifecycles from start to finish. Consider standard customer signup. A client submits name, email, password, and optionally phone number to `/api/auth/signup`. The backend validates the payload, ensures the email is not already in use, hashes the password, creates the user with the `customer` role, provisions an empty cart document, provisions an empty wishlist document, issues a JWT token, and returns both the token and a sanitized user payload. From that point onward, the client can behave as an authenticated customer without a second bootstrap step.

Merchant signup is similar but includes store creation. The backend validates the merchant payload, creates a merchant user, generates a unique slug from the submitted store name, creates the store record, updates the user’s `storeId`, issues a JWT token, and returns both merchant and store information. This means merchant provisioning is self-contained inside one transaction-like flow, even though there is no explicit database transaction in the current code.

Product browsing is relatively simple but still instructive. The client calls `/api/products` with optional filters such as store slug, category, search term, and stock state. The backend queries the `Product` collection, optionally resolves the store slug to a store ID, excludes draft products unless explicitly asked not to, and applies extra filtering for ratings and max price. The result is returned as a raw product list. The Android app then enriches that list into UI models, derives image galleries, calculates stock display values, and produces recommendation and category views.

Direct checkout from the Android app demonstrates deeper domain behavior. The app submits a list of item payloads to `/api/orders/checkout`. The backend validates the array, tries to resolve each item to a real product, checks stock or variant stock, computes totals, validates coupons, decrements stock, groups items by store, creates one order per store bucket, and returns order IDs plus a grand summary. The app then clears the local cart and shows a success screen. The key point is that even though the mobile client passes a candidate order, the backend still performs authoritative validation and reshaping.

An admin product update follows another important lifecycle. The web app submits an update request to `/api/admin/products/:id`. The backend validates permissions, checks that the category is valid if it changed, normalizes sizes, colors, images, and other fields, writes the updated product, records an audit log, and returns the changed product. This lifecycle illustrates the pattern used repeatedly across the staff surfaces: validation, scoped access check, business rule enforcement, persistence, then audit recording.

## Appendix D: Data Relationship Narrative

At the center of the data model is the `User` document. A user may be only a customer, or that user may also be linked to a `Store` through `storeId` when acting as a merchant. A store points back to its owning user through `ownerUserId`, making the merchant-store relationship bidirectional across two collections.

Products can optionally point to a store. When they do, they become merchant-scoped inventory entries. Categories do not currently attach to products by ObjectId reference; instead, products store the category slug as a string. This makes category rename operations more involved, because product documents must be updated when a slug changes, but it also keeps product reads simple and removes the need for category joins in the most common catalog fetches.

Orders connect customers, stores, and merchants. The top-level `Order` document points to the purchasing user and optionally to the store and merchant. Each embedded item can also carry store and merchant information, which makes downstream reporting more resilient and preserves context even if related entities later change. Disputes reference orders, customers, stores, and merchants to support after-sales investigation.

Carts and wishlists are both anchored to a user. Carts are mutable staging areas for potential purchases. Wishlists are longer-lived intent containers with alert metadata. Coupons can be global or store-specific, which means they may apply at the marketplace level or only within a merchant context. Audit logs are linked to the acting user rather than the target entity, because they are meant to capture responsibility for sensitive changes.

## Appendix E: Role-by-Role Capability Summary

Customers can sign up, log in, browse products, explore stores, add items to a local cart, maintain a wishlist, place orders, view order history, request returns or refunds for delivered orders, open disputes, and manage their own profile and addresses. They are the baseline role and are intentionally limited to self-service operations.

Merchants are operationally different from customers because they are tied to a store. In the admin route group they can access staff surfaces, but most data is filtered to their own store. They can manage products inside that scope, view and update their relevant orders, manage coupons scoped to their store, and update shipment details. They do not automatically receive full platform-wide visibility.

Support users gain access to staff capabilities intended for service operations. They can enter the admin route group, inspect dashboard information, and work with disputes or order-related surfaces depending on the specific endpoint. However, more destructive actions remain reserved for higher roles.

Managers can perform broader operational tasks than support users. Product creation and update, coupon creation and update, and order status changes are examples of actions protected by `requireManagerOrAbove`. This role represents a mid-level operations authority.

Admins gain platform-wide powers. They can delete products and categories, manage merchants, manage user roles, access audit logs, and view or manage resources across stores instead of within only one store scope. Super admins sit above admins and represent the highest trust level. The current code especially protects super admin accounts from being deleted through admin user management.

This layered model is important because it demonstrates that Cartify is not using a single monolithic admin flag. It supports graduated privilege and therefore can evolve toward more formal organizational operations.

## Appendix F: Operational Runbook Notes

From an operational perspective, the minimum backend readiness checks are simple but important. MongoDB connectivity must succeed, required environment variables must be present, and the `/health` endpoint should return `{ ok: true }`. Because the backend exits if MongoDB fails to connect, deployment monitors should treat process uptime as meaningful rather than assuming the service can partially operate without the database.

If staff users report missing permissions, the first place to inspect is the environment-driven email role mapping. Since login can recalculate roles based on email address, a mismatch between expected role and actual role may come from the configured email lists rather than from a bug in route middleware. If a merchant is missing store-scoped data, checking the `storeId` field on the user record and the `ownerUserId` linkage on the store record is the next logical step.

For product visibility issues, the most important checks are `status`, `storeId`, category slug validity, and stock quantity if the client is using in-stock filters. For wishlist anomalies, inspect the per-user wishlist document and verify whether products still exist, because the response model tolerates product references that may no longer resolve cleanly. For checkout failures, common causes include invalid coupons, insufficient stock, unresolved product identifiers, or empty cart state.

Sales reporting depends entirely on order data, so inconsistent sales numbers should be investigated by checking whether orders were created with the correct totals, status values, and store assignments. Growth metrics depend on search-event logging and wishlist contents in addition to orders, so they represent engagement signals rather than purely financial truth.

## Appendix G: Testing and Quality Strategy Suggestions

The current repository shows the strongest test evidence in the Android layer. That is a good start, but the backend contains enough business logic that automated API tests would add substantial value. Candidate high-value backend test areas include auth signup and login, merchant signup, category slug migration behavior, coupon validation, direct checkout stock enforcement, dispute duplicate prevention, return/refund request gating, and admin role enforcement.

For the web app, component and route-level tests would be most valuable around protected routes, auth persistence, merchant signup fallbacks, admin page data loading, and role-based redirects. Since much of the frontend complexity lies in permission-dependent views rather than isolated pure functions, integration-style tests would likely provide more confidence than extremely granular component tests alone.

For Android, further investment could focus on auth continuation flows, store mode transitions, wishlist synchronization behavior, and checkout error handling. Because the mobile app intentionally mixes local-only experience state with backend-backed state, regression testing those boundaries would be particularly useful.

In addition to automated tests, lightweight contract documentation between frontend and backend would be beneficial. The current codebase is readable enough to infer contracts directly, but as the project grows, explicit contract artifacts or schema validation would reduce accidental drift between the Android models, the React client, and the backend responses.

## Appendix H: Architectural Tradeoffs

Several tradeoffs in the current design appear intentional. The use of embedded order items sacrifices some normalization but preserves historical order accuracy and simplifies reporting. The use of local mobile experience storage introduces the possibility of multi-device inconsistency, but it significantly improves responsiveness and enables experimentation without expanding the backend too early.

The presence of both server-side cart APIs and a local Android cart repository is another tradeoff. It gives the mobile team freedom to provide a fast local experience while the backend evolves toward stronger cross-device commerce consistency. The downside is conceptual duplication. Eventually the project may choose one cart authority or define a formal synchronization strategy.

Using category slugs rather than category IDs in product documents makes catalog reads lightweight and keeps product payloads simple. The downside is that category rename and delete operations must propagate changes into products. The current admin route code already handles that, which means the team has accepted the write-side cost in exchange for simple read-side behavior.

The environment-driven role override mechanism is operationally convenient because privileged staff access can be granted by configuration. The tradeoff is that login semantics depend partly on deployment configuration, so environment drift can create permission surprises if not carefully managed. This is manageable, but it should be documented for operators, which is one reason it is emphasized in this README.
