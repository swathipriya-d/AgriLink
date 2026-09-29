# AgriLink API reference

Local API origin: `http://localhost:4000`. Vite frontend: `http://localhost:3000`; its development proxy maps `/api/*` to the API so browser code uses **relative same-origin paths**. All JSON success bodies use `{ "success": true, "data": { ... } }`. All API errors use a JSON `message` and machine-readable `code` where applicable. API responses are private/no-store.

Import `postman/AgriLink.postman_collection.json` and `postman/AgriLink Local.postman_environment.json` in Postman. Set `baseUrl` to the API origin. After running one of the demo-session requests, its tests put the signed JWT in the corresponding `buyerToken`, `farmerToken`, or `adminToken` environment variable. Do not ship real tokens.

## Health and product discovery

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | API and database mode, `persistentWrites`, Cloudinary configuration and demo notice. No credential is returned. |
| `GET /api/products` | Public | Search/list products. Query: `search`, `category`, `city`, `minPrice`, `maxPrice`, `verified=true|false`, `inStock=true`, `sort=newest|price-low|price-high|stock`, `page`, `limit` (1–48). |
| `GET /api/products/:id` | Public | Read one active product. |
| `GET /api/products/review-queue` | Admin | Read active pending listings awaiting a market review. |
| `PATCH /api/products/:id/verification` | Admin | Mark a listing `verified` or `rejected` (moderation history is separate from regulated product certification). |
| `POST /api/products` | Farmer | Add a listing owned by the current farmer; newly submitted listings start `pending`. |
| `PATCH /api/products/:id` | Owning farmer | Edit their own listing fields. Unknown fields are rejected. |
| `DELETE /api/products/:id` | Owning farmer | Soft-archive their own active listing; it disappears from browsing. |

A listing accepts a `name`, a valid `category`, `pricePerKg`, `stockKg`, ISO `harvestDate` (`YYYY-MM-DD`) and optional `cultivar`, `minOrderKg`, `deliveryWindow`, `story`, `description`, `tags` (up to 8), and safe `imageUrl`. Price and amount are positive/bounded numbers; category and unknown fields are validated server-side. Only same-origin local image paths or HTTPS Cloudinary image URLs are accepted.

Rejected market-review status remains explicitly visible; it is not labelled as a pending review or a verified listing, and buyers cannot submit a new order for it. `POST /api/orders` responds `409 LISTING_REJECTED` until an admin changes the review status.

Example browse query:

```http
GET /api/products?search=tomato&category=Vegetables&maxPrice=150&inStock=true&sort=price-low
```

Example create listing:

```json
{
  "name": "Monsoon garden okra",
  "cultivar": "Tender local green",
  "category": "Vegetables",
  "pricePerKg": 64,
  "stockKg": 18,
  "minOrderKg": 2,
  "harvestDate": "2026-09-29",
  "deliveryWindow": "Tomorrow, 6–9 am",
  "story": "Picked by the people who tended the plot.",
  "tags": ["Small batch", "Picked to order"]
}
```

## Authentication and roles

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | Public | Create a buyer or farmer account, bcrypt-hash the password, and return `{ data: { user, token } }`. Public registration does **not** accept `admin`. New passwords are at least 10 characters. Farmers must provide farm name, district and state. |
| `POST /api/auth/login` | Public | Check email/password and return a signed short-lived HS256 bearer JWT. |
| `GET /api/auth/me` | Authenticated | Reload the active account from the store/database and return its public profile (without password data). |
| `POST /api/auth/demo-session` | No-Mongo development demo only | Request `{ "role": "buyer" }`, `farmer` or `admin` and receive a temporary seeded demo session. Returns `404` outside the no-database in-memory mode. This is a demonstration shortcut, not production identity proof. |

Send an authenticated JWT in `Authorization: Bearer <token>`. The API verifies the HS256 algorithm, issuer/audience and expiry, reloads the current active user and uses the database user role for authorization; a token by itself does not grant a stale role. Production startup requires `MONGODB_URI` and a configured `JWT_SECRET` of at least 32 characters. Public registration cannot create moderators; production administrator identity/provisioning must be provided by the deployment owner.

## Order requests and fulfilment

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/orders` | Buyer | Place a no-payment order request: `{ "items": [{ "productId": "...", "quantityKg": 2 }], "deliveryNote": "..." }`. Each product is unique within a request, buyer cannot order their own farm's listing, one order is for one farm, quantity must meet the minimum and available stock, rejected review status returns `409 LISTING_REJECTED`, and the price/total are calculated server-side. |
| `GET /api/orders` | Authenticated buyer or farmer | Return only that account's own purchases or incoming farm requests, newest first. Admins do not receive private orders. |
| `GET /api/orders/analytics` | Farmer | Farmer-scoped listing/order performance summary. |
| `GET /api/analytics/farmer` | Farmer | Primary frontend analytics endpoint. |
| `PATCH /api/orders/:id/status` | Owning farmer | Advance the farm's request through the allowed next status. |
| `PATCH /api/orders/:id/cancel` | Owning buyer | Cancel an eligible order request; stock is returned. |

Lifecycle: `placed → confirmed → packing → ready → delivered`. A buyer may cancel while an order is `placed` or `confirmed`; once stock is returned and cancellation is recorded, that order cannot advance further. The API checks the requested quantity again when decrementing inventory and returns a stock-conflict error if the remaining amount has changed. Monetary amounts, fee/rate and farmer net are **indicative snapshots**, not a payment, charged commission, statement, transfer or payout.

## Grower identity and listing review

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/verification` | Farmer | Submit farm name, district, state, crops, optional practices and grower note for review. |
| `GET /api/verification/me` | Farmer | Read that farmer's latest review request and public profile. |
| `GET /api/verification/queue?status=pending|verified|rejected|all` | Admin | Read authorized human moderation queue. Defaults to `pending`. |
| `PATCH /api/verification/:id/review` | Admin | Review a pending grower request: `{ "status": "verified", "reviewNote": "..." }` or `rejected`. |

A review reflects checks on submitted marketplace origin/identity details. It does **not** claim that a crop is food-safe, organic, certified, graded, inspected by government, or compliant with any regulated standard. “Verified farmer” and “reviewed listing” are separate signals.

## Photo uploads

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/uploads/image` | Farmer; multipart form field `image` | Validate file size, allowed image MIME, and detected image bytes, then upload to Cloudinary from the backend if fully configured. |

Allowed: JPEG, PNG, WebP, AVIF; maximum 5 MiB. The server returns the HTTPS Cloudinary URL only after a successful provider upload. If the provider is not configured, it returns `503 UPLOAD_NOT_CONFIGURED` and confirms that no file was uploaded. The frontend can preview a selected photo locally, but the local preview is not a saved or shared market image. This endpoint must never be used to disclose provider credentials.

## Validation, rate limits and implementation

- Express rejects excessive request bodies, malformed JSON, unknown write keys, unsupported lifecycle transitions and invalid schema values.
- API traffic has a request limit; login/registration/demo-session share a stricter authentication limiter. Response headers are hardened and API responses are not shared-cacheable.
- MongoDB uses Mongoose models for user/farm profile, product, order-price snapshots and auditable grower verification. If a Mongo URI is supplied but cannot connect, startup fails instead of claiming the in-memory demo has persisted data.
- Without `MONGODB_URI`, the development-only sample store is in process memory and resets on API restart. The password/key held by the demo process are not test or production account credentials.
- The custom generated hero/crop/farm images and icon are local static files under `frontend/public/`; they do not rely on Cloudinary. Cloudinary is exclusively for farmer-submitted images when configured.
- The frontend build has no separate database dependency and must never contain JWT signing or Cloudinary secret values.
