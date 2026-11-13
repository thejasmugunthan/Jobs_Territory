# Jobs Territory - Smart Candidate Job Portal

A modern, production-ready, full-stack recruitment and candidate job portal platform. Built with a FastAPI modular monolith backend and a React + Vite + TypeScript + Tailwind CSS frontend.

---

## 🚀 Key Features

### Phase 16: Application Analytics (Tasks 157–164)
- **Application Statistics API**: Detailed overview of total applications, status counts, success rates, weekly trends, and chronological activity.
- **Application Trends**: Time-series aggregation (daily, weekly, monthly) with zero-filling and date boundary filtering.
- **Status Distribution**: Real-time breakdown across all application lifecycle statuses (`submitted`, `under_review`, `shortlisted`, `interview`, `selected`, `rejected`, `withdrawn`).
- **Weekly Activity**: Monday-Sunday calendar week aggregation with safe UTC date handling.
- **Application Success Metrics**: Shortlist rate and Offer rate calculations with transparent formulas, avoiding zero-division and withdrawn miscounting.
- **Visual Dashboard**: Modern Recharts dashboard featuring interactive trend line charts, status distribution donut chart, weekly bar charts, stat cards, date-range filters, and mobile-friendly layouts.

### Phase 17: Additional Features (Tasks 165–172)
- **Job Comparison**: Side-by-side comparison of up to 4 active jobs with real-time difference highlighting, synchronized storage, and comparison drawer.
- **Public Job Sharing**: Canonical `/public/jobs/:jobId` shareable links, Web Share API integration, copy-to-clipboard, WhatsApp, and email sharing.
- **Global Search**: Debounced instant search (300ms) with keyword filtering, categories, location suggestions, and keyboard navigation.
- **Dark Mode**: Centralized theme context supporting Light, Dark, and System preference with local persistence and backend synchronization.
- **Account & Security Settings**: Account info update, password change with automatic session / refresh token revocation, notification preferences, and account deletion request.
- **Profile Visibility Controls**: Candidate controls for recruiter search discovery, contact visibility, and resume visibility.
- **Help & Support System**: Searchable FAQ accordions organized by topic (Account, Jobs, Resume, Applications) and direct support ticket submission backed by database persistence.
- **Full Responsive Design**: Optimized across mobile (320px, 375px, 425px), tablet (768px), and desktop (1024px, 1440px+).

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ORM & Database**: SQLAlchemy 2.0, PostgreSQL / Supabase / SQLite
- **Validation**: Pydantic v2
- **Migrations**: Alembic
- **Authentication**: JWT (Access & Refresh tokens) with bcrypt password hashing
- **Testing**: Pytest

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Data & Charts**: Axios, Recharts, Lucide React
- **Forms**: React Hook Form, Zod
- **Testing**: Vitest, React Testing Library

---

## 📁 Repository Structure

```
Job_Project/
├── Job_Portal_Backend/          # FastAPI backend service
│   ├── app/
│   │   ├── analytics/           # Application Analytics module
│   │   ├── api/v1/              # Versioned API routes
│   │   ├── auth/                # JWT auth, user identity & security
│   │   ├── candidate/           # Candidate profiles & resumes
│   │   ├── jobs/                # Job management & search
│   │   ├── applications/        # Job application workflows
│   │   ├── notifications/       # User alerts & notifications
│   │   └── support/             # Help & support requests
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Backend test suite (61 tests)
│   └── requirements.txt
│
└── Job_portal_Frontend/         # React + Vite frontend
    ├── src/
    │   ├── components/          # Reusable UI, Layout, Navigation
    │   ├── context/             # Auth, Theme, and App state
    │   ├── features/
    │   │   ├── analytics/       # Analytics dashboard & charts
    │   │   ├── jobs/            # Job listings, details & comparison
    │   │   ├── applications/    # Candidate application tracker
    │   │   ├── profile/         # Candidate profile management
    │   │   ├── settings/        # Account & privacy visibility settings
    │   │   └── support/         # Help & Support ticket submission
    │   └── pages/               # Top-level page views
    └── package.json
```

---

## 🏃 Getting Started

### 1. Backend Setup

```bash
cd Job_Portal_Backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd Job_portal_Frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## 🧪 Running Tests

### Backend Tests
```bash
cd Job_Portal_Backend
.\venv\Scripts\python -m pytest tests
```

### Frontend Tests & Type Checking
```bash
cd Job_portal_Frontend
npm test
npm run build
```

---

## 📄 License
Private and confidential. Developed for Jobs Territory.

