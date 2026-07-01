Delivery Module

Quick usage and setup

1. Install dependencies and generate Prisma client

```powershell
cd backend
npm install
npx prisma generate
```

2. Set environment variables (example)

```powershell
setx DELIVERY_PROVIDER PORTER
setx PORTER_API_URL "https://api.porter.example"
setx PORTER_API_KEY "your_key"
```

3. Run the app (your existing dev flow)

```powershell
npm run build
npm run dev
```

Notes

- Delivery provider selection is controlled by `DELIVERY_PROVIDER` env var.
- Platform delivery shares are stored in `PlatformDeliverySetting` (Prisma model). Use admin endpoints to change.
- Webhooks: POST `/webhook/delivery` receives provider events. Ensure your provider sends `providerOrderId`/`orderId` and `status`.
- Porter adapter uses `axios` and will fallback to mock behavior when `PORTER_API_URL`/`PORTER_API_KEY` are not set.

Security

- Routes use existing `customerAuth`, `sellerAuth`, and `adminAuth` middleware; ensure those are enabled.

Testing

- Use admin endpoints to create or reassign deliveries; use seller flow to mark ready for pickup.
