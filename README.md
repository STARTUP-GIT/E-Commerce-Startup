# E-Commerce-Startup

Multi-service e-commerce platform: customer, seller, admin, platform, delivery, and payment backend APIs plus their frontends.

## Backend services

All services live in `backend/` and share one Prisma schema (`backend/prisma/`):

| Service | Entrypoint | Default port |
|---|---|---|
| Customer | `backend/customer.server.ts` | 3001 |
| Seller | `backend/seller.server.ts` | 3002 |
| Admin | `backend/admin.server.ts` | 3003 |
| Delivery | `backend/delivery.server.ts` | 3004 |
| Payment | `backend/payment.server.ts` | 3005 |
| Platform | `backend/platform.server.ts` | 3006 |

## Database (Neon + Prisma)

The backend uses Neon (PostgreSQL) with two connection strings:

- **`DATABASE_URL` — POOLED connection.** Prisma Client uses this at runtime. Host contains the `-pooler` segment, e.g. `ep-xxx-pooler.c-3.aws.neon.tech`.
- **`DIRECT_URL` — DIRECT connection.** Used only by Prisma Migrate / CLI (`validate`, `generate`, `migrate deploy`, `studio`). Host is the SAME endpoint WITHOUT `-pooler`, e.g. `ep-xxx.c-3.aws.neon.tech`.

> **Why both?** Neon's pooled endpoint is a PgBouncer-style transaction pool. Prisma Migrate needs to acquire advisory locks and run multi-statement transactions, which fail through a transaction pooler (error P1002). `DIRECT_URL` lets migrations talk to the database directly while the app keeps using the pooler.
>
> Do **NOT** use the pooled URL as `DIRECT_URL`.

Both variables are **required** for `prisma migrate deploy` to succeed. In local development the runtime falls back to `DATABASE_URL` if `DIRECT_URL` is omitted; in production the app fails fast with a clear message instead of crashing later in Prisma.

## Setup

```bash
cd backend
cp .env.example .env   # fill in real values, see .env.example
npm ci
npx prisma migrate deploy
npm run build
```

Run a service:

```bash
npm run start:customer   # or seller / admin / platform / delivery / payment
```

## Render deployment

Each service deploys from the `backend/` directory with build command `npm run build` (runs `prisma generate && tsc`) and a pre-deploy command of `npx prisma migrate deploy`.

### Required environment variables (set on EVERY service)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** URL (`-pooler`) |
| `DIRECT_URL` | yes | Neon **direct** URL (no `-pooler`) — required for the build and `migrate deploy` |
| `JWT_SECRET_KEY` | yes | long random string |
| `JWT_REFRESH_SECRET_KEY` | no | falls back to `JWT_SECRET_KEY` |
| `GOOGLE_CLIENT_ID` | yes | |
| `GOOGLE_CLIENT_SECRET` | no | |
| `PAYMENT_GATEWAY` | yes | `RAZORPAY` or `PHONEPE` |
| `RAZORPAY_KEY_ID` | yes* | if `PAYMENT_GATEWAY=RAZORPAY` |
| `RAZORPAY_KEY_SECRET` | yes* | if `PAYMENT_GATEWAY=RAZORPAY` |
| `RAZORPAY_WEBHOOK_SECRET` | yes* | if `PAYMENT_GATEWAY=RAZORPAY` |
| `PHONEPE_MERCHANT_ID` | yes* | if `PAYMENT_GATEWAY=PHONEPE` |
| `PHONEPE_SALT_KEY` | yes* | if `PAYMENT_GATEWAY=PHONEPE` |
| `RESEND_API_KEY` | yes | transactional email |
| `EMAIL_FROM` | yes | sender address |
| `CLOUDINARY_CLOUD_NAME` | yes | image storage |
| `CLOUDINARY_API_KEY` | yes | image storage |
| `CLOUDINARY_API_SECRET` | yes | image storage |
| `CUSTOMER_FRONTEND_URL` | yes | CORS |
| `SELLER_FRONTEND_URL` | yes | CORS |
| `ADMIN_FRONTEND_URL` | yes | CORS |
| `PLATFORM_FRONTEND_URL` | no | CORS |
| `CORS_ORIGINS` | no | comma-separated override of the above |
| `DELIVERY_PROVIDER` | no | default `PORTER` |
| `PORTER_API_KEY` | yes* | if `DELIVERY_PROVIDER=PORTER` |
| `PORTER_API_URL` | no | default `https://api.porter.in` |
| `PORTER_WEBHOOK_SECRET` | yes* | if `DELIVERY_PROVIDER=PORTER` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET` | no | only if using S3 uploads |
| `NODE_ENV` | yes | `production` on Render |

\* validated conditionally by `backend/src/config/envValidator.ts`.

> Missing `DIRECT_URL` in production fails the build with `Prisma schema validation (P1012) Environment variable not found: DIRECT_URL`. Paste the Neon **direct** connection string into the `DIRECT_URL` env var of every Render service (Build + Runtime).

## Docker

```bash
cd backend
cp .env.example .env
docker compose up --build
```

`docker-compose.yml` runs `prisma migrate deploy` in a one-shot `migrate` service before starting the APIs. The local Postgres has no pooler, so `DIRECT_URL` equals `DATABASE_URL` there.
