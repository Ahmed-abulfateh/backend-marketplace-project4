# backend-marketplace-project4

Marketplace backend API built with Express and MongoDB. It supports authentication, profile and cart/favorites state, listing management, checkout/order workflows, and admin seller approval.

## Tech Stack

- Node.js + Express (ES modules)
- MongoDB + Mongoose
- JWT authentication
- Nodemailer (optional, for email notifications)

## Project Structure

- `controllers/` business logic
- `routes/` API route definitions
- `models/` Mongoose schemas
- `middleware/` auth, role checks, error handler
- `lib/` auth and marketplace core helpers
- `scripts/` utility scripts (admin creation)
- `seed/` initial seed data

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection URI

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace-project4
JWT_SECRET=change-me-in-production

# Frontend URL used for CORS and password reset links
FRONTEND_URL=http://localhost:5173

# Optional SMTP settings for real emails (password reset + order notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Optional sender address override for order emails
WORKSPACE_EMAIL=
```

Notes:

- If `JWT_SECRET` is missing, a development fallback is used.
- If SMTP values are not provided, email actions return/generate links without sending real email.

## Install and Run

```bash
npm install
npm run dev
```

Production mode:

```bash
npm start
```

## NPM Scripts

- `npm start` start server with Node
- `npm run dev` start server with nodemon
- `npm run admin:create -- --username <u> --email <e> --phone <p> --password <pw>` create an admin user

Example:

```bash
npm run admin:create -- --username ops-admin --email ops@example.com --phone 97330000000 --password StrongPass123!
```

## API Base URL

- Base API prefix: `/api`
- Local default: `http://localhost:3000/api`

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <token>
```

Tokens are returned by sign in/up and are valid for 7 days.

## Seeded Users

On startup, `ensureSeedData()` upserts users from `seed/initialData.js` if they do not already exist.

Current seeded accounts include admin, seller, and buyer users defined in the codebase.

## API Endpoints

### Store

- `GET /api/health` health check
- `GET /api/bootstrap` return current marketplace store snapshot

### Auth

- `POST /api/auth/sign-up` create buyer/seller account
- `POST /api/auth/sign-in` sign in by username/email/phone + password
- `POST /api/auth/request-password-reset` authenticated; creates reset token and sends email if SMTP is configured
- `POST /api/auth/reset-password` reset password using token

### Profile

- `PATCH /api/profile` update account/profile fields
- `POST /api/profile/favorites/:listingId/toggle` toggle favorite listing
- `POST /api/profile/cart/:listingId/toggle` toggle cart listing

### Listings

- `POST /api/listings` seller/admin only (seller must be active)
- `PATCH /api/listings/:listingId` seller/admin only
- `DELETE /api/listings/:listingId` seller/admin only
- `PATCH /api/listings/:listingId/status` seller/admin only
- `POST /api/listings/:listingId/notes` admin only (moderation note)
- `POST /api/listings/:listingId/reviews` buyer/admin; buyer must have delivered order for listing

### Orders

- `POST /api/orders/checkout/create` create checkout order(s)
- `POST /api/checkout` alias route to checkout create
- `PATCH /api/orders/:orderId/advance` seller/admin manage order status
- `POST /api/orders/:orderId/messages` buyer/seller/admin send order message

### Admin

- `GET /api/admin/sellers` admin only; list seller accounts
- `PATCH /api/admin/sellers/:userId/status` admin only; set `pending` or `active`

## Frontend Integration (Axios)

Install Axios in your frontend project:

```bash
npm install axios
```

Create `src/api/client.js`:

```js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Common Response Behavior

- Success responses commonly include `{ store: ... }` after mutations.
- Auth responses include `{ token, store }`.
- Errors return JSON with `message` and suitable HTTP status codes.

## CORS

Configured for:

- `FRONTEND_URL` if provided
- localhost and 127.0.0.1 common dev ports
- Localhost origins with any numeric port during development

## Troubleshooting

- Startup fails with "Missing MONGODB_URI": set `MONGODB_URI` in `.env`.
- 401 on protected route: include Bearer token and ensure token is valid.
- Seller blocked from listing actions: seller account status must be `active`.
- No password reset/order email sent: configure SMTP env vars.