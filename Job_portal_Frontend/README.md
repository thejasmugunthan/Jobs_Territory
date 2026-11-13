# Jobs Territory frontend

Responsive React 18, TypeScript, Vite, and Tailwind foundation for the candidate portal. The interface follows the supplied references: purple candidate dashboard and left navigation, a pastel job-card system, an accessible application timeline component, and a dashed resume picker.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the FastAPI origin (default `http://localhost:8000`). Vite variables are public browser configuration; never put database credentials, JWT signing keys, Supabase service-role keys, or SMTP credentials in this file. The backend must allow the frontend origin in `CORS_ORIGINS`.

## Verify

```powershell
npm test
npm run build
```

## API integration and data availability

- Registration calls `POST /api/v1/auth/register` with `full_name`, `email`, and `password`; the API returns a safe user object but does not log the user in. The UI routes to sign-in after registration.
- Login calls `POST /api/v1/auth/login`, then validates the session using `GET /api/v1/auth/me`.
- The Axios client holds both returned tokens in module memory, attaches the access token as a Bearer token, and rotates through `POST /api/v1/auth/refresh` after a `401`. Logout calls `POST /api/v1/auth/logout` with the current access token and refresh token.
- Password reset uses the backend's generic `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` contracts.
- Profile details and progress use `GET/PATCH /api/v1/profile/me` and `GET /api/v1/profile/completion`.
- Candidate onboarding is available at `/onboarding`; profile details can be edited later at `/profile`. Both routes use the same profile section components and save each section directly through the profile API. The wizard stores only its current step in local storage; candidate data stays in the backend.
- Personal information uses `POST /api/v1/profile` for first-time initialization and `PATCH /api/v1/profile/me` for subsequent edits. If a profile has not been initialized, `GET /api/v1/profile/me` returns 404; the UI treats that as a new profile and only marks onboarding complete after a successful create.
- Education, experience, projects, certifications, skills, preferences, and completion use the existing `/api/v1/profile/*` endpoints. List mutations use the API's `{success,message,data}` envelope; DELETE calls return 204. Skills are selected from `/skills/catalog` and are never created by the browser.
- The dashboard, profile page, and onboarding review display `completion_percentage`, `completed_sections`, `incomplete_sections`, and `section_scores` from `GET /api/v1/profile/completion`; the browser does not calculate the overall score.
- Job discovery uses `GET /api/v1/jobs`, `GET /api/v1/jobs/search`, and `GET /api/v1/jobs/{job_id}`. Search and filters remain in the URL, are validated before requests, and use the backend's repeated query parameters for locations, skills, employment types, and work modes.
- Job details record authenticated views through `POST /api/v1/jobs/{job_id}/view`; recently viewed jobs use the authenticated `GET /api/v1/jobs/recently-viewed` and `DELETE /api/v1/jobs/recently-viewed/{job_id}` endpoints. Failed view tracking does not block job details.
- Job applications use multipart `POST /api/v1/jobs/{job_id}/applications`; candidate identity comes from the existing JWT. `/applications` lists real applications with status counts, search, sorting, and pagination. Application details use ownership-filtered detail/status/history APIs and request a short-lived signed resume link only when the candidate selects Download.
- Saved jobs use `GET/POST/DELETE /api/v1/jobs/{job_id}/save` and `GET /api/v1/jobs/saved`; save state is shared across search cards and job details. `/saved-jobs` shows saved listings, including a generic unavailable state if an employer closes a job.
- Resume uploads accept optional PDF files up to 5 MB. The backend requires the private Supabase `candidate-resumes` bucket and keeps service-role credentials out of the frontend. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the backend and provision that bucket as private. The interview schedule API and resume analyzer are not available.

## Session persistence security

The existing FastAPI login contract returns the refresh token in JSON. Persisting that token in local storage or session storage would expose it to JavaScript and increase the impact of cross-site scripting. This implementation keeps access and refresh tokens in memory, so a full page reload ends the frontend session and requires sign-in again. A secure persistent session needs a coordinated backend change: set and rotate the refresh token in a `Secure`, `HttpOnly`, `SameSite` cookie; read it from the cookie during refresh/logout; clear it on logout; configure explicit credentialed CORS; and protect cookie-authenticated state changes with a CSRF token/origin validation. Until that backend contract exists, the frontend does not silently move the refresh token into browser storage.

## Structure

```text
src/
  app/                 router, error boundary
  components/          common controls, layout, dashboard, job, resume, timeline
  features/             landing, auth, dashboard, jobs, applications, profile
  pages/                settings, legal, auth entry pages, not found
  routes/               protected/public route gates
  services/             centralized Axios API client
  styles/               design tokens and responsive layout
  test/                 Vitest setup
```
