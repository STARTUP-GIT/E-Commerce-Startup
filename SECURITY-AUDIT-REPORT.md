# Aura Marketplace — Security & Performance Audit Report

Date: 2026-08-02
Scope: `backend` (Express/Prisma multi-server monolith), `sellers-app` (Vite React), `admin` (Next.js), `customer-app` (Next.js)

Audit run as 13 parts. All fixes are applied in the working tree and verified
with `npx tsc --noEmit` (backend + customer-app), `npm run build` (sellers-app),
`npm test` (backend suite), and `npx eslint` on edited admin files. The backend
Prisma schema validates with `npx prisma validate`.

---

## PART 1 — Seller Bill/Invoice UI
- Rewrote `sellers-app/src/features/orders/ui/SellerInvoice.tsx` as a GST-style invoice: AURA header, bill-to box, place-of-supply strip, items table with HSN/SAC + tax columns, tax summary, amount-in-words, payment/delivery cards, footer.
- Added `amountInWords` and `formatDateTime` helpers in `sellerInvoiceService.ts`.
- Print CSS switched to `display: revert` + `print-color-adjust` so print output is visible on white paper and CSS-grid/layout prints correctly.

## PART 2 — Orders table (sellers-app)
- Added a **Customer** column (full name + email) to `OrdersPage.tsx`.
- Orders search now matches customer name in addition to order number/status.
- API layer (`ordersApi.ts`) extended to expose customer info from order payloads.

## PART 3 — Rate limiting coverage
Applied the existing limiters to previously-uncovered routes:
- Customer write routes: cart, customOrder, notification, order, wishlist (`writeLimiter`); public reads city + reviews (`publicReadLimiter`) plus caching.
- Seller: orders, analytics, category, customOrder, location, notification, payout, product, profile, review, shop routes (`writeLimiter`); upload endpoints additionally get `uploadLimiter`.
- Delivery: `deliveryRoute` + `sellerDeliveryRoute` (`writeLimiter`, `uploadLimiter` on proof upload); admin delivery routes already limited.

## PART 4 — Caching
- Added `cache(60)` to `getProductReviews` (public GET).
- Added `invalidatePublicCache()` on customer review create/edit/delete and seller reply/delete mutations so cached product pages stay fresh.
- Confirmed caching is limited to public GETs only (never user-specific/order/payment/admin data).

## PART 5 — SQL injection / query hardening (Prisma-only stack)
- No raw SQL exists anywhere (Prisma only), so the risks were ordering, pagination, and LIKE:
- `productController` + `shopController`: `sortBy` whitelist (`createdAt|updatedAt|price|name|stockQuantity`), clamped `page ≥ 1`, `limit` capped at 100, `escapeLike()` for `name`/`description` `contains`, NaN-safe `minPrice`/`maxPrice`/`rating` filters.
- `getNearbyShops`: radius clamped to max 500 km; `lat`/`lng` validated (|lat|≤90, |lng|≤180).
- Delivery list endpoints (`deliveryController.getDeliveries`, `adminDeliveryController.getAllDeliveries`) clamped to limit 100.
- Seller `getOrders` nested listing capped with `take: 1000` (previously unbounded).

## PART 6 — Command injection audit
- Grep across all backend `.ts` for `child_process`, `exec`, `execSync`, `spawn`, `eval`, `new Function` → **zero matches**. No command execution is possible; no fixes needed.

## PART 7 — Security hardening
- Removed JWT/token contents from seller `authController` login logging and from `customerAuth` middleware (cookie/header dumps).
- Added `isBanned`/`isDeactivated`/`status` (`DISABLED`, `BANNED`) enforcement in `sellerAuth.ts` and `authGuard.ts` (seller + customer cases).
- Closed an auth gap: payment routes for admin approve/revoke packing-fee now require `adminAuth`.
- Fixed IDOR in `cuntomorderController.ts`: a seller can no longer accept/reject a custom order that already has another seller's accepted quote.
- Forgot-password flows (seller + customer) now return a generic 200 with no identity or account-state leak; removed the `emailDelivery: 'failed'` oracle and the SMTP `error` field leak; removed `req.body` from error-path logging.
- Razorpay webhook signature check switched to constant-time compare (`crypto.timingSafeEqual`).
- **CSRF**: the seller `seller_session` cookie must be `SameSite=None` (cross-origin SPA), which CORS alone does not protect against form-based CSRF. Added `backend/src/middleware/csrfOriginCheck.ts` — validates the `Origin`/`Referer` of every state-changing request that carries a session cookie against the allowlist (non-browser clients without an Origin header still pass).
- **SameSite hardening**: `customer_session` and `admin_session` are only consumed on the Next.js frontend origin (server-side rewrites), so `SameSite=None` was unnecessary. Both re-emitted cookies now use `SameSite=Lax`.
- Removed admin login route logging of the raw `Set-Cookie` header (exposed the JWT to server logs).

## PART 8 — Backend performance
- `getNearbyShops`: added a bounding-box prefilter (`latitude`/`longitude` gte/lte) to the Prisma query so the JS distance sort runs on a small candidate set instead of every APPROVED shop in the DB.
- Removed debug `console.log` blocks in admin `deliveryMethodController`/`paymentMethodController` (which also logged request bodies and full records).

## PART 9 — Frontend performance
- **Code splitting**: `App.tsx` now lazy-loads all 18 route pages (named-export mapping) behind a `Suspense` fallback. Analytics/recharts no longer load for every visit; verified per-page chunks in the build output.
- Removed `console.log` from `useOrders.ts` (sellers-app) and cookie-set debug logs in customer-app API routes.
- Admin `QueryClient` now disables `refetchOnWindowFocus` and sets `gcTime` (was default). Sellers-app config was already sane.
- Fonts: moved Google Fonts `@import` (render-blocking) out of CSS — sellers-app uses preconnected `<link>` in `index.html`; admin already used `next/font` (self-hosted) so the redundant `@import` was removed and `--font-sans` now references the `--font-inter` variable.
- Deleted dead file `GoogleMockPage.tsx` (never imported).

## PART 10 — Database indexes
- Schema was already comprehensively indexed. Added the one genuine gap: `@@index([latitude, longitude])` on `SellerAddress` to support the `getNearbyShops` bounding-box query (and future geo queries).
- `prisma validate` passes. Apply with `npx prisma migrate dev` and redeploy.

## PART 11 — Docker
- `docker-compose.yml` rewrote: secrets now interpolate from `.env` (`${VAR:?...}` fails fast if unset) instead of being hardcoded; added API healthchecks (via `/health`); DB port no longer published publicly (bound to `127.0.0.1`); added a dedicated one-shot `migrate` service that runs `prisma migrate deploy` once and gated all API services on it (`service_completed_successfully`).
- All 5 Dockerfiles: removed the duplicated `prisma migrate deploy` from `CMD` (now owned by the migrate service) and created `uploads/temp` owned by the `node` user so multer temp uploads work in the container.
- Added `backend/.dockerignore` (node_modules, dist, .git, .env, uploads, logs → smaller context, secrets never copied).
- Added `backend/.env.example` documenting every required variable.

## PART 12 — Code quality
- Backend `package.json`: removed dead `react`/`@types/react`; moved `typescript` + all `@types/*` to `devDependencies` (build-time only; shrinks the Docker runtime stage).
- Removed remaining `console.log` debug noise in admin `DeliveryMethodsPage` / `PaymentMethodsPage` (also fixed the unused `payload`/`response` vars they left behind).
- Request logger audited: logs only method/path/ip/UA/content-type — no auth headers, cookies, or bodies.
- Note: 4 pre-existing `no-explicit-any` lint errors remain in the two admin pages (not introduced here); the admin repo has ~200 pre-existing lint findings left untouched.
- Note: untracked local scripts `query-sellers.js`, `reactivate-sellers.js`, `test-prisma.js` reference `dist/src/...` paths and are not wired into `package.json` — candidate cleanup.

## PART 13 — Outstanding recommendations (not applied)
1. **Rotate secrets**: `backend/.env` contains live Razorpay/Google/Cloudinary/Resend/Neon credentials. Rotate before any environment exposes the file, and verify none leaked into git history (`git log -p -- backend/.env`).
2. **`prisma migrate deploy`** must be run once after merging (new `SellerAddress` index).
3. Consider a `SameSite=Strict` variant for the seller cookie on non-payment endpoints, or a double-submit CSRF token, for defense in depth.
4. Add CSP directives for the seller/admin apps (helmet already provides sane defaults on the backend).
5. Move the remaining `@types/*`-style lint debt and the ~200 admin lint findings to a follow-up.
6. Frontend bundle: main chunk is still ~748 kB minified (react + axios + supabase + framer-motion). Consider `manualChunks` to split vendor code.
7. Rate limiter config values (window/max) should be tuned per endpoint once traffic data exists.

## Verification summary
- `backend`: `npx tsc --noEmit` ✓, `npm test` ✓ (all suites green), `npx prisma validate` ✓
- `sellers-app`: `npm run build` ✓ (lazy chunks confirmed)
- `admin`: `npx eslint` on edited files ✓ (only pre-existing findings)
- `customer-app`: `npx tsc --noEmit` ✓
