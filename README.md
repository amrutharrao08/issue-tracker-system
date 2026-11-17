# Issue Tracker System

A web-based issue tracking application with user registration, login, admin role, issue management, assignment, status tracking, comments and dashboard statistics.

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: bcryptjs password hashing and JWT

## Run locally
1. Install Node.js.
2. In `backend`, run `npm install`.
3. Create `backend/.env`:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=replace_with_a_long_random_secret
   ADMIN_NAME=Administrator
   ADMIN_EMAIL=admin123@gmail.com
   ADMIN_PASSWORD=Admin@123
   ```
4. Run `npm start` from `backend`.
5. Open `frontend/index.html` in a browser.

The first admin account is created from the ADMIN_* variables when the server starts, if that email does not already exist. Keep `.env` private and never commit it.

## Features
- User registration and login
- Admin account provisioned from environment variables
- Password hashing and JWT-based authentication
- Create and edit issues
- Admin-only issue deletion
- Admin assignment to registered users
- Open, In Progress and Closed status tracking
- Comments on issues
- Dashboard issue counts

## API overview
- `POST /api/auth/register` – create a standard user
- `POST /api/auth/login` – authenticate
- `GET /api/auth/me` – current account
- `GET /api/users` – list registered users (authenticated)
- `GET /api/issues` – list issues (authenticated)
- `POST /api/issues` – create issue (authenticated)
- `PUT /api/issues/:id` – update issue (authenticated; assignment field admin-only)
- `DELETE /api/issues/:id` – delete issue (admin only)
- `POST /api/issues/:id/comments` – add comment (authenticated)

## Notes
- Update the `BASE` constant in `frontend/script.js` to your deployed backend URL before hosting the frontend.
- Configure `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and optionally `ADMIN_NAME` as backend environment variables on the hosting provider.
- Configure CORS to allow only your deployed frontend origin before production use. The current sample uses open CORS for quick testing.
- Deployment URLs should be added here after successful deployment; no live URL is claimed in this repository version.
