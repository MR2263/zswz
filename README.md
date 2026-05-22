# Goods Showcase

This project is a separated frontend and backend site for displaying goods and managing inventory.

## Structure

- `frontend`: React + Vite storefront and merchant admin UI
- `backend`: Express + SQLite API, analytics, logs, image upload, and Excel export

## Features

- Public storefront with responsive product cards, detail pages, live stock display, search, and category filters
- Fixed notice text for QQ contact and pickup policy
- Merchant admin with single-user login, product publish/unpublish, stock adjustment, category management, logs, and analytics
- Excel export for product and analytics data
- Basic security with JWT auth, Helmet, and API rate limiting

## Local run

### Backend

```powershell
cd backend
npm install
npm run dev
```

Runs on `http://localhost:4000`.

Default admin credentials:

- username: `admin`
- password: `admin123456`

You should replace them in production with environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`.

If your backend is not on port `4000`, set `VITE_API_BASE_URL`.
