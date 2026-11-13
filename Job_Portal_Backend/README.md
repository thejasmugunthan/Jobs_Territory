# Jobs Territory API

Synchronous FastAPI and SQLAlchemy 2.0 backend. Authentication is managed by this service with the application's `users` table; Supabase Auth is not used.

## Setup

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET_KEY` (at least 32 random bytes), issuer/audience, explicit comma-separated CORS origins, and mail configuration in `.env`. The example intentionally leaves the signing key empty, so the application refuses to start until you set it. Never commit `.env`. In production, use PostgreSQL, HTTPS, a real SMTP provider, and a secret manager. Development email mode prints a reset link to the application logger and is rejected in production; it is only a local development transport.

## Database and server

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

The application does not create production tables automatically. The included first migration creates `users`, `candidate_profiles`, `auth_sessions`, and `password_reset_tokens`. If a pre-existing production schema exists, inspect it and create a reviewed baseline/upgrade migration before applying this initial migration.

Interactive OpenAPI docs are at `http://localhost:8000/docs`; OpenAPI JSON is at `/openapi.json`.

## Authentication behavior

- Registration accepts only `full_name`, `email`, and `password`; users are always created with role `candidate`. Email is trimmed and case-folded.
- Passwords use `pwdlib`'s recommended Argon2id configuration. The password service upgrades hashes on successful login when parameters change.
- Login returns a 15 minute JWT access token and a random opaque refresh token. The database stores only a SHA-256 hash of each refresh token. Send the access token as `Authorization: Bearer <access_token>` and the refresh token in the JSON body of refresh/logout requests. Keep both secret in the client; production clients should use secure transport.
- Refresh rotates the session row and invalidates the prior refresh token. Reuse of a rotated token revokes every active session for that account. A short access token is valid until expiry unless its session is revoked; protected requests also check the session row, so logout/reset revokes access tokens immediately. This requires a database lookup per protected request.
- Password reset links are single-use and expire after the configured interval. Successful reset revokes all sessions.
- Login and forgot-password attempts are limited to 10 per client IP per minute using an in-process limiter. This works for a single process; deploy a shared rate limiter (for example Redis-backed) before running multiple workers or replicas.

## Endpoints

| Method | URL | Auth | Request | Success |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | No | `{"full_name":"Ada Lovelace","email":"ada@example.com","password":"StrongPassword123"}` | `201` safe user |
| POST | `/api/v1/auth/login` | No | `{"email":"ada@example.com","password":"StrongPassword123"}` | `200` access and refresh tokens |
| POST | `/api/v1/auth/refresh` | No | `{"refresh_token":"..."}` | `200` rotated token pair |
| POST | `/api/v1/auth/logout` | Candidate access token | `{"refresh_token":"..."}` | `200` message |
| POST | `/api/v1/auth/logout-all` | Candidate access token | none | `200` message |
| POST | `/api/v1/auth/forgot-password` | No | `{"email":"ada@example.com"}` | Generic `200` message |
| POST | `/api/v1/auth/reset-password` | No | `{"token":"...","new_password":"AnotherStrong123"}` | `200` message |
| GET | `/api/v1/auth/me` | Candidate access token | none | `200` safe user |

Typical errors: `401` invalid credentials or authentication, `403` insufficient role, `409` duplicate registration email, `422` invalid request, `429` rate limited. Forgot-password always returns the same response for known and unknown emails. Profile/application routes can use `Depends(get_current_candidate)` from `app.dependencies`; filter all candidate-owned records using `user.id` from that dependency, never a client-supplied candidate ID.

## Postman examples

```http
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{"full_name":"Ada Lovelace","email":"ada@example.com","password":"StrongPassword123"}
```

```http
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{"email":"ada@example.com","password":"StrongPassword123"}
```

Use returned `access_token` as a Bearer token for `/me`, and pass `refresh_token` in the JSON body of `/refresh` or `/logout`.

## Candidate profile APIs (Phase 4)

All `/api/v1/profile` endpoints require a candidate Bearer token. Candidate IDs come from the authenticated database user; no endpoint accepts a candidate ID as ownership authority. Successful responses use `{"success":true,"message":"...","data":...}`. Profile resource errors use the same shape with `success:false`, `message`, and `error_code`; FastAPI validation errors remain standard `422` responses. Lists accept `limit` (default 50, maximum 100) and `offset` where applicable.

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/v1/profile` | Initialize the profile record created during registration; second initialization returns `409` |
| GET/PATCH | `/api/v1/profile/me` | Read or partially update candidate profile |
| POST/GET | `/api/v1/profile/education` | Create or list education |
| GET/PATCH/DELETE | `/api/v1/profile/education/{education_id}` | Read, update, or delete owned education |
| POST/GET | `/api/v1/profile/experience` | Create or list work experience |
| GET/PATCH/DELETE | `/api/v1/profile/experience/{experience_id}` | Read, update, or delete owned experience |
| GET | `/api/v1/profile/skills/catalog?search=python` | Search the read-only global skill catalog |
| POST/GET | `/api/v1/profile/skills` | Add a catalog skill to this candidate or list their skills |
| PATCH/DELETE | `/api/v1/profile/skills/{skill_id}` | Change proficiency or remove the candidate association |
| POST/GET | `/api/v1/profile/projects` | Create or list projects |
| GET/PATCH/DELETE | `/api/v1/profile/projects/{project_id}` | Read, update, or delete owned projects |
| POST/GET | `/api/v1/profile/certifications` | Create or list certifications |
| GET/PATCH/DELETE | `/api/v1/profile/certifications/{certification_id}` | Read, update, or delete owned certifications |
| GET/PUT | `/api/v1/profile/preferences` | Read or replace job preferences |
| GET | `/api/v1/profile/completion` | Calculate completion from the live profile and related records |

Example profile initialization:

```http
POST http://localhost:8000/api/v1/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{"full_name":"Ada Lovelace","phone_number":"+14155552671","profile_headline":"Backend Engineer","professional_summary":"Experienced engineer building reliable production systems and APIs.","country":"United States","linkedin_url":"https://www.linkedin.com/in/ada"}
```

Example education record:

```http
POST http://localhost:8000/api/v1/profile/education
Authorization: Bearer <access_token>
Content-Type: application/json

{"institution_name":"Example University","degree":"BSc","field_of_study":"Computer Science","start_date":"2020-09-01","end_date":"2024-05-30","is_currently_studying":false}
```

Completion weights follow the brief: basic profile 20, professional summary 10, education 15, work experience 15, skills 15, projects 10, certifications 5, and preferences 10. Basic profile points are earned proportionally across name, phone, headline, location, and country; summary requires at least 30 non-whitespace characters; the other sections receive their weight when at least one qualifying record or preference exists. Scores are calculated at request time and are not stored.

## Phase 4 schema migration

The repository previously had no models or migration history for education, work experience, skills, candidate preferences, projects, or certifications. Migration `0002_candidate_profile` extends the existing profile table, creates those missing tables, and seeds a modest global skill catalog. It does not drop existing data. The initial auth migration is still the only source of the `users` and `candidate_profiles` base tables in this repository. Review both revisions against the actual Supabase schema before applying them to an already provisioned database.

## Candidate job discovery APIs (Phase 7)

The repository contained no `companies`, `jobs`, `job_skills`, or `recently_viewed_jobs` models or migration before Phase 7. Migration `0003_job_management` adds those missing tables and references the existing `skills` and `users` tables. It adds **no sample or production job records**. Job status defaults to `draft`; candidate endpoints only return `published`, non-deleted jobs whose application deadline is today or later. Job creation and publishing are intentionally not exposed by these candidate routes.

> Before applying `0003_job_management` to an already provisioned Supabase database, compare those four table names and columns with the live schema. This workspace does not contain a live schema snapshot, and applying the migration to a database that already has any of those tables will conflict. The migration was not run against Supabase.

All listing and search filters combine with **AND**. Repeated `location`, `employment_type`, and `work_mode` values match **any** selected value. Repeated/comma-separated skill names match required job skills using the selected `skills_match` strategy. Range boundaries are inclusive. Missing experience bounds act as open bounds. Salary bounds only compare jobs with a disclosed salary and require an explicit currency; currencies are never converted or compared with each other.

### Endpoints

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/jobs` | Public | List published candidate-visible jobs |
| GET | `/api/v1/jobs/search` | Public | Search and filter the same published job set |
| GET | `/api/v1/jobs/{job_id}` | Public | Read complete details for a published job |
| POST | `/api/v1/jobs/{job_id}/view` | Candidate bearer token | Atomically record or increment the candidate's view |
| GET | `/api/v1/jobs/recently-viewed?page=1&page_size=20` | Candidate bearer token | List the authenticated candidate's viewed jobs |
| DELETE | `/api/v1/jobs/recently-viewed/{job_id}` | Candidate bearer token | Remove an owned recently viewed record (`204`) |

`GET /api/v1/jobs/search` supports the same filters as the listing endpoint. Parameters:

| Parameter | Allowed values / behavior |
|---|---|
| `q` | Up to 160 characters; whitespace normalized; escaped, case-insensitive partial phrase search across title, description, company, and required skills |
| `location` | Partial match against location/city/state/country; may be repeated or comma-separated; alternatives are ORed |
| `city`, `state`, `country` | Case-insensitive partial match; these individual filters combine with AND |
| `min_experience`, `max_experience` | Non-negative decimal years; inclusive overlap; rejects min greater than max |
| `min_salary`, `max_salary` | Non-negative bounds; requires `currency`; inclusive disclosed-salary overlap; rejects min greater than max |
| `currency` | Three-letter code, case-insensitive; required when either salary bound is used |
| `employment_type` | Repeatable: `full_time`, `part_time`, `internship`, `contract`, `freelance` |
| `work_mode` | Repeatable: `remote`, `hybrid`, `on_site` |
| `skills` | Repeatable and/or comma-separated skill names; only required job skills are considered |
| `skills_match` | `any` (default) requires one selected required skill; `all` requires every selected skill. Unknown skills never match; with `all`, any unknown skill yields no results. |
| `sort_by` | `latest` (default), `oldest`, `salary_high`, `salary_low`, `experience_low`, `relevant` |
| `page` | One-based, defaults to `1` |
| `page_size` | Defaults to `20`, range `1..100` |

`relevant` requires a non-empty `q`; phrase matches in the title rank before other results, with newest posting and UUID as deterministic tie-breakers. This is the implemented ranking rule; it is not a machine-learning or full-text relevance score. Salary sorts put undisclosed values last. All other sorts also use a deterministic UUID tie-breaker.

Example combined search:

```http
GET /api/v1/jobs/search?q=software%20engineer&city=Bengaluru&min_experience=0&max_experience=2&min_salary=300000&max_salary=800000&currency=INR&employment_type=full_time&work_mode=hybrid&skills=Python,React&skills_match=any&sort_by=latest&page=1&page_size=20
```

Listing and search return Pydantic-validated responses in this shape:

```json
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "title": "Python Developer",
      "company": {"id": "00000000-0000-0000-0000-000000000002", "name": "Example Company", "logo_url": null},
      "description_summary": "Build Python services for customers",
      "location": {"name": "Bengaluru", "city": "Bengaluru", "state": "Karnataka", "country": "India"},
      "employment_type": "full_time",
      "work_mode": "hybrid",
      "experience": {"minimum": 0, "maximum": 2},
      "salary": {"minimum": 300000, "maximum": 800000, "currency": "INR"},
      "skills": ["FastAPI", "Python"],
      "openings": 1,
      "posted_at": "2026-11-13T10:00:00Z",
      "application_deadline": null,
      "status": "published"
    }
  ],
  "pagination": {"page": 1, "page_size": 20, "total_items": 1, "total_pages": 1, "has_next": false, "has_previous": false}
}
```

Job details add the complete description, responsibilities, required and preferred qualifications, benefits, and company description/website. Details return `404` for missing, unpublished, deleted, closed, or expired jobs. Invalid UUIDs and query parameters return `422`.

Recently viewed history always derives candidate identity from the JWT. The view endpoint uses PostgreSQL `INSERT .. ON CONFLICT DO UPDATE` (and SQLite's equivalent for tests) against the unique candidate/job key, refreshing `viewed_at` and incrementing `view_count` safely under concurrent requests. History is ordered newest first and excludes jobs that are no longer candidate-visible. A candidate cannot list or remove another candidate's view; removing a record owned by another candidate returns `404`.

Authenticated request examples:

```http
POST /api/v1/jobs/00000000-0000-0000-0000-000000000001/view
Authorization: Bearer <access_token>
```

```http
GET /api/v1/jobs/recently-viewed?page=1&page_size=20
Authorization: Bearer <access_token>
```

```http
DELETE /api/v1/jobs/recently-viewed/00000000-0000-0000-0000-000000000001
Authorization: Bearer <access_token>
```

The POST response contains `job_id`, `viewed_at`, and the incremented `view_count`. Recently viewed GET uses the same `items`/`pagination` structure as listings and adds `viewed_at` and `view_count` to each item. Common errors are `401` missing/invalid candidate authentication, `403` authenticated non-candidate role, `404` missing/non-public jobs or unowned view history, and `422` invalid UUID/filter/range/sort/page. Database failures return a generic `503`; raw SQL/database details are not returned or logged.

### Query performance and migration

The repository filters, counts, sorts, and pages in SQL. List responses join the company once and fetch required skills for the page in a single batched query; skill filtering uses correlated counts/EXISTS so joins do not duplicate job rows. PostgreSQL indexes cover visibility/posting, location, employment/work mode, experience, salary/currency, job-skill lookup in both directions, and candidate viewing history. Because search uses substring `ILIKE`, the PostgreSQL migration also creates `pg_trgm` GIN indexes on job title/description, company/skill names, and city/state/country. These add write and storage overhead in exchange for supporting the actual search predicates.

Apply the migration only after comparing it with the provisioned database:

```powershell
alembic upgrade head
```

No live PostgreSQL connection was available for `EXPLAIN ANALYZE`; the tests use an isolated in-memory SQLite database and verify behavior, not production query plans. After applying the reviewed migration to a non-production PostgreSQL environment, inspect representative filtered/search plans before rollout.

## Tests and lint

```powershell
pytest -q
ruff check app tests migrations
black --check app/jobs app/models.py app/main.py migrations/versions/0003_job_management.py tests/test_jobs.py
mypy app/jobs
```

## Applications and saved jobs (Phase 9â€“10)

Migration `0004_applications_saved_jobs` adds `applications`, `application_status_history`, and `saved_jobs`; earlier migrations did not contain these tables. It enforces the candidate/job unique keys, allowed statuses, foreign keys, and candidate/status/history indexes. Review the migration against the target schema, then apply it to a non-production database with `alembic upgrade head` before production rollout.

Candidate APIs use the existing JWT candidate dependency and never accept `candidate_id` from the browser:

- `POST /api/v1/jobs/{job_id}/applications` accepts multipart `resume` (optional PDF up to 5 MiB) and `cover_letter` (optional, up to 5,000 characters).
- `GET /api/v1/applications` supports `status`, `q`, `page`, `page_size`, and `sort_by`; response includes real per-status counts.
- `GET /api/v1/applications/{application_id}`, `/status`, and `/history` enforce ownership and hide unowned records as 404.
- `GET /api/v1/applications/{application_id}/resume` creates an authorized short-lived signed link.
- `GET/POST/DELETE /api/v1/jobs/{job_id}/save` and `GET /api/v1/jobs/saved` check, save, remove, and list candidate-owned jobs. Duplicate saves are idempotent; application duplicates return 409.

Resume files are signature-checked PDFs, limited to 5 MiB, stored in the private `candidate-resumes` Supabase bucket with server-generated paths. The backend verifies the bucket is private before upload/download operations, keeps the service-role key server-side, and attempts compensating deletion if the database transaction fails. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESUME_BUCKET=candidate-resumes`, and `RESUME_SIGNED_URL_TTL_SECONDS=300` in the backend environment. Provision the bucket as private before enabling resume uploads. Resume bytes are not stored in PostgreSQL.

Status history is created on application submission and updated transactionally through `PATCH /api/v1/internal/applications/{application_id}/status`, which accepts only authenticated users whose existing role is `recruiter` or `admin`. Candidate-facing status updates do not exist. Allowed transitions are validated and terminal outcomes cannot be reopened. Candidate withdrawal is not enabled. This project does not yet include recruiter account provisioning or organization/job-scoped recruiter permissions; those must be configured before exposing the internal route to a recruiter UI. End-to-end Supabase uploads and signed downloads require a configured private test bucket; automated backend tests use SQLite and a fake storage adapter and never access live Supabase.

## Resume analysis and job compatibility (Phase 11–12)

The analyzer uses the existing private `candidate-resumes` bucket. Set `RESUME_MAX_SIZE_BYTES`, `RESUME_MAX_PAGES`, and `RESUME_MAX_TEXT_CHARACTERS` to control parser limits. Install backend dependencies with `pip install -r requirements.txt`; PyMuPDF is used without OCR. Textless/scanned PDFs are reported as `needs_ocr`; encrypted, malformed, empty, or too-large documents are not treated as analyzed. Machine extraction is an unverified suggestion and never writes to the candidate profile.

- `POST /api/v1/resumes/upload` uploads a PDF and queues analysis.
- `GET /api/v1/resumes` lists only the signed-in candidate's resume history.
- `GET /api/v1/resumes/{resume_id}/analysis` returns the latest structured analysis and a short lived private preview link.
- `POST /api/v1/resumes/{resume_id}/retry` retries failed processing; `DELETE` removes the resume and analysis record.
- `GET /api/v1/jobs/{job_id}/match` returns the deterministic compatibility estimate from confirmed profile data.

Compatibility uses required skills (60%), verified experience (25%), and explicit education requirements (15%). Missing categories are omitted and available weights are renormalized; no required skill set produces a not-applicable skill score. Match responses are cached against a fingerprint of candidate and job inputs. Education requirements are recognized only when explicit degree terms appear in job required qualifications.

Resume parsing uses bounded page, byte, and text sizes and runs as a FastAPI background task. The first implementation uses conservative rule-based extraction; institution/company inference and OCR are not attempted. Candidates should review extracted values and add confirmed details through the existing profile editor before matching.

## Recommendations, alerts, analytics and account tools (Phases 13–17)

The added Alembic revisions are `0006_recommendations_alerts_analytics`, `0007_job_alert_preferences`, and `0008_candidate_salary_currency`. Review and apply with `alembic upgrade head` against the target database. The current local SQLite database is at revision `0008_candidate_salary_currency`; no production database was contacted.

Candidate APIs:

- `GET /api/v1/recommendations?page=1&limit=12` ranks published, unexpired jobs and excludes jobs already applied to. It combines available verified skills (40%), role preferences (20%), locations (15%), experience (15%), and employment/work/salary factors (10%), renormalizing available weights. Salary overlap is evaluated only when candidate and job currency codes match.
- `GET /api/v1/recommendations/similar/{job_id}` returns skill/title/location matches.
- `GET /api/v1/dashboard` aggregates actual application statuses, saved jobs, profile completion, recent applications/activity, and top recommendations.
- `/api/v1/job-alerts` provides candidate-scoped create/list/get/update/delete. `GET /api/v1/notifications`, `/unread-count`, and read/read-all/delete endpoints are candidate-scoped and idempotent for job alerts. Application received/status notifications are written in trusted application workflows.
- `GET /api/v1/analytics/applications` accepts `start`, `end`, and `period=day|week|month`. It uses SQL grouping, returns all status buckets, and defines shortlist and offer rates with numerator and denominator.
- `/api/v1/account/preferences` manages theme and alert preference; `/api/v1/account/password` verifies the current password and revokes sessions. `/api/v1/profile/visibility` controls recruiter discovery, contact display, and whether an available resume is advertised. Recruiter discovery returns only visible profiles and never serves resume files.
- `GET /api/v1/search/jobs?q=...` searches only public published job data.

Alerts are checked idempotently when a candidate requests notifications; matching checks published jobs created within the recent seven-day window. The application has no job publishing event hook, scheduler, email, or push provider, so immediate/daily/weekly values are saved preferences, not delivery guarantees. Job alerts notify in the portal only. Job category fields and recruiter organization scoping are not present in this codebase; recommendations use titles and candidate-visible fields rather than inventing either.

The frontend adds recommendations, alerts, notification center, application insights, session-scoped comparison (maximum three jobs), public job share pages, global job suggestions, theme selection, account/password settings, and recruiter visibility settings. Charts use accessible, data-backed SVG line and donut charts without adding a charting dependency. Email changes and account deletion remain unavailable because verified account workflows are not implemented.

Production verification still requires deploying migrations to a non-production PostgreSQL environment first and exercising scheduled job alert delivery only after a publisher/scheduler integration is chosen. Backend tests run against isolated SQLite fixtures; live Supabase and recruiter account provisioning were not tested.
