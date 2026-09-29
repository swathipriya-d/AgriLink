# AgriLink — Farmer-to-Buyer Marketplace

**A shorter journey from good soil to a good table.** AgriLink gives growers a direct digital stand and gives buyers a clearer view of who grew a harvest, where it came from, what is available, and what the asking price includes.

> **The idea judges should remember:** AgriLink is not just another crop catalogue. It is a **Harvest Ledger**—grower identity, place, picking window, live stock, asking price, review status, and the next step of each order are shown together, rather than hidden behind an anonymous wholesale listing.

This is a hackathon-ready MERN marketplace with original AgriLink branding and crop imagery, a React buyer/farmer experience, a Node/Express/Mongoose API, role-scoped workflows, Postman material, and an explicit reset-on-restart demo mode. It makes **no real payments, sales, payouts, certification, or live impact claims**.

## What makes the product different

- **Price and person in the same frame.** Every product card shows its grower, farm, district, harvest note, asking price per kilogram, and amount on hand.
- **Traceable harvest, not generic “farm fresh.”** Shoppers can follow the product detail's grower/origin/picking notes and read the status applied to the listing.
- **A farm that can actually work.** Growers manage their own listings, photos, prices, stock, incoming order notes, request status, verification submissions, and simple marketplace analytics.
- **Role boundaries visible in the interface and enforced by the API.** Buyers request; farmers fulfil their own orders; an admin-only market desk moderates origin and listing information.
- **An honest ledger.** The page illustrates a proposed ₹96/₹4 division of each ₹100 and example ₹0 / ₹399 subscription ideas. They are explicitly hypotheses; payment processing is not implemented and nothing is charged.
- **Origin review is not certification.** “Market reviewed” means a marketplace profile/listing review. It does not prove food safety, organic status, a regulated grade, or a government certification.

## Three-minute judge walkthrough

The sample credentials have no static passwords. Open the site, select **Join the market → Explore the judge demo**, and choose each clearly labelled role:

1. **Buyer:** search or filter the market, open the tomato/mango detail, inspect its grower and transparent price, request a quantity, then open **Your orders**. A request changes sample stock and its status in the running demo; it is not a sale or a payment.
2. **Farmer:** open the **Farm studio** to see the grower's own listings, stock, orders and analytics. Create/edit/archive a harvest, preview an image, submit grower-origin details for review, and advance an order from confirmation toward dispatch. Without Cloudinary credentials, the selected photo is previewed in the browser and is not uploaded.
3. **Market keeper:** open the role-specific **Market desk** to see pending grower and listing review and the narrow administrator controls. Administrators cannot be created by public sign-up.
4. **The story:** open **The difference** to explain source-to-buyer transparency and the proposed subscription/commission models without presenting either as an activated fee.

The built-in market begins with a small, deliberately readable sample: six produce listings across Nashik, Satara and Ratnagiri, three fictional farmer profiles, one sample completed order, and one pending verification record. Their prices, identities, availability, orders, analytics and review examples are illustrative. They reset when the API process restarts.

## Run it locally (VS Code)

**Requirements:** Node.js 20.10 or newer and pnpm 10 or newer. The project was developed with Node.js 22 and pnpm 11.

1. Open the `AgriLink` folder in VS Code.
2. In its integrated terminal:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Visit **http://localhost:3000**. The React/Vite frontend proxies same-origin `/api` requests to the Express API on port `4000`.
4. `Ctrl+C` stops both local processes. Run the existing source/build check with `pnpm check`.

No database or image-provider account is needed for a local demonstration. If the API is stopped, the market remains browseable with local fixture cards and displays a browse-only status. A fresh demo API process rebuilds its data from the sample records.

### Persistent MongoDB mode (optional)

To make user records, harvests, inventory, orders and review records survive a restart:

```bash
cp backend/.env.example backend/.env
```

Put a MongoDB connection URI in **`backend/.env` only**. In development, a configured Mongo URI is attempted explicitly; a failed database connection refuses startup instead of silently falling back to demo data. A successful Mongo connection switches the UI and API to persistent mode.

Set a unique signing secret before using any deployment:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copy that generated value into `JWT_SECRET` in `backend/.env`. **Production requires a private `JWT_SECRET` of at least 32 characters and a valid `MONGODB_URI`; production refuses to start without them.** Configure secrets in the production environment rather than in Git or a container image. A demo uses a newly generated in-memory JWT key and intentionally invalidates prior demo sessions on restart. Email/password signup works as a temporary in-memory account in development; demo-seeded accounts are opened using the role demo buttons rather than their fake email addresses.

### Optional product photo uploads (Cloudinary)

The API-side Cloudinary adapter activates only after all three credentials are configured in `backend/.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Keep them on the server. The image endpoint accepts JPEG, PNG, WebP or AVIF up to **5 MB**, checks the image signature, and limits the feature to an authenticated farmer. If Cloudinary is absent, the endpoint clearly returns `503 UPLOAD_NOT_CONFIGURED`; the website never reports that a preview-only browser image was uploaded. **The four generated marketplace/hero images in `frontend/public/images` are local demo artwork and do not require Cloudinary.**

## Application map

| Path | Purpose |
| --- | --- |
| `/` | Landing page, market search, selected seasonal harvests and farmer call to action |
| `/market` | Product market; text/place/category/price/review/stock filters, sorting and empty/reset states |
| `/product/:id` | Harvest detail, farm provenance, stock/minimum order, price example and order request |
| `/orders` | Signed-in buyer's request history and current order status |
| `/farmer` | Role-aware farmer studio or moderator market desk, including inventory, reviews and analytics |
| `/how-it-works` | Traceability story, proposed fee illustration and explicitly hypothetical subscriptions |

The frontend uses lazy-loaded pages. `frontend/public/manus-routes.json` lists each current page route (not APIs, assets or the not-found fallback). The app and all static demo assets work from the ordinary Vite public folder in an unmodified local checkout.

## API and account notes

- The origin `GET /api/health` reports whether the API is in **`demo`** mode (`persistentWrites: false`) or the Mongo-backed **`mongo`** mode, whether images can be uploaded, and a plain-language demo reset notice.
- API success bodies follow `{ success: true, data: ... }`; API errors return a JSON message/code. Authenticated browser calls send `Authorization: Bearer <JWT>` and use tab-scoped session storage.
- Buyers, farmers and moderators have separate demo-session buttons **only when `MONGODB_URI` is absent**. These are role-play sessions for sample data, not identity verification. An administrator cannot be signed in through public registration/login in the product API.
- Normal registration/password login are implemented; the local demo account/profile exists in memory and disappears on restart. Mongo mode uses Mongoose persistence. Passwords are hashed with bcrypt; signed HS256 tokens expire after 12 hours by default.
- New listings are marked pending until a moderator reviews them. Farmers may alter only their own listings; only the owning grower may advance fulfilment. Buyers may see their own orders and cancel eligible pending requests. An order is capped to the stock and asking price the server read and rechecks stock before reserving it.
- Order creation records a **request** with an immutable listing-price snapshot and decrements sample/Mongo stock. It does not process a payment. A cancelled eligible order returns its quantity to stock.
- `GET /api/analytics/farmer` and its farmer-only API alias `GET /api/orders/analytics` report order/listing metrics. `estimatedFarmerNet` and the `4%` support fee are proposed examples, never a financial statement.
- See [`docs/api-reference.md`](docs/api-reference.md) and import [`postman/AgriLink.postman_collection.json`](postman/AgriLink.postman_collection.json) plus [`postman/AgriLink Local.postman_environment.json`](postman/AgriLink%20Local.postman_environment.json) for ready-to-edit requests.

## Code layout

```text
AgriLink/
├── README.md                         # This guide and judge walkthrough
├── app.config.ts                     # Full-square project-brand logo metadata
├── package.json / pnpm-lock.yaml     # Workspace commands and reproducible package lock
├── frontend/
│   ├── public/brand/                 # Original mark, icon and favicon
│   ├── public/images/                # Offline-ready original hero and crop imagery
│   └── src/{App.jsx,components,data,lib,pages,styles}
├── backend/
│   ├── src/config/                   # Mongo, JWT and Cloudinary boundary
│   ├── src/controllers/              # API inputs/outputs and domain validation
│   ├── src/middleware/               # JWT/roles, request schemas and JSON errors
│   ├── src/models/                   # Mongoose User/Product/Order/Verification
│   ├── src/routes/                   # Express API routes
│   └── src/services/                 # In-memory demo plus Mongo repository
├── docs/api-reference.md
└── postman/                          # Importable API requests and sample environment
```

## Hackathon scope and launch boundary

This folder is complete source code for a local demonstration. It is **not** a deployed AWS/Vercel service; no production database, Cloudinary credentials, email provider, delivery/fulfilment integration, payment gateway, or moderator identity provider is configured. No individual GitHub destination was specified, so the project is not pushed to a personal GitHub account. The project repository is ready for you to connect to your own GitHub remote. Do not use the fictional example accounts as real-world identities or treat demo metrics as verified impact.

🔗 GitHub Repository

The AgriLink project source code and documentation are available in this repository.

The repository contains the complete frontend, backend, demo data, API documentation, Postman collection, and setup instructions required to run the project locally.

«⚠️ Environment files containing secrets are excluded from Git. Use "backend/.env.example" as the template for local configuration.»