import uuid
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models import (
    User, CandidateProfile, Company, Job, Skill, JobSkill, CandidateSkill,
    Application, CandidatePreferences
)
from app.core.security import hash_password

def seed():
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    try:
        # 1. Companies (guarantee standard companies exist)
        companies_data = [
            ("Jobs Territory Labs", "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128", "Premier recruitment and high-impact tech solutions company.", "https://jobsterritory.com"),
            ("CloudScale Systems", "https://images.unsplash.com/photo-1551434678-e076c223a692?w=128", "Next-gen distributed cloud infrastructure and microservices.", "https://cloudscale.example.com"),
            ("Apex AI Solutions", "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=128", "Enterprise agentic AI models and intelligent automations.", "https://apexai.example.com"),
            ("FinVantage Capital", "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128", "Leading modern fintech building real-time payment rails.", "https://finvantage.example.com"),
        ]
        companies = []
        for name, logo, desc, url in companies_data:
            existing_company = db.query(Company).filter_by(name=name).first()
            if not existing_company:
                c = Company(
                    id=uuid.uuid4(),
                    name=name,
                    logo_url=logo,
                    description=desc,
                    website_url=url,
                    created_at=now - timedelta(days=90)
                )
                db.add(c)
                companies.append(c)
            else:
                companies.append(existing_company)
        db.flush()

        # 2. Common Skills
        skill_names = ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "Node.js", "Tailwind CSS", "AWS", "GraphQL", "Redis", "Next.js", "Kubernetes"]
        skills = {}
        for sname in skill_names:
            existing_skill = db.query(Skill).filter_by(name=sname).first()
            if existing_skill:
                skills[sname] = existing_skill
            else:
                sk = Skill(id=uuid.uuid4(), name=sname, category="Engineering")
                db.add(sk)
                db.flush()
                skills[sname] = sk

        # 3. Published Jobs
        existing_jobs = db.query(Job).filter_by(status="published", is_deleted=False).all()
        if not existing_jobs:
            jobs_spec = [
                {
                    "title": "Senior Full Stack Engineer",
                    "company": companies[0],
                    "location": "Bengaluru, Karnataka",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "country": "India",
                    "employment_type": "full_time",
                    "work_mode": "hybrid",
                    "min_exp": 5,
                    "max_exp": 9,
                    "min_sal": 1800000,
                    "max_sal": 2800000,
                    "currency": "INR",
                    "openings": 2,
                    "days_ago": 14,
                    "skills": ["React", "TypeScript", "Python", "FastAPI"],
                    "desc": "Join Jobs Territory Labs to lead full-stack product development for high-scale talent acquisition and analytics platforms.",
                },
                {
                    "title": "Lead Frontend Architect",
                    "company": companies[0],
                    "location": "Remote / Bengaluru",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "country": "India",
                    "employment_type": "full_time",
                    "work_mode": "remote",
                    "min_exp": 6,
                    "max_exp": 10,
                    "min_sal": 2400000,
                    "max_sal": 3500000,
                    "currency": "INR",
                    "openings": 1,
                    "days_ago": 7,
                    "skills": ["React", "TypeScript", "Tailwind CSS", "GraphQL"],
                    "desc": "Architect reusable design systems and performant user experiences across our core candidate-facing products.",
                },
                {
                    "title": "Cloud Infrastructure & Backend Engineer",
                    "company": companies[1],
                    "location": "Hyderabad, Telangana",
                    "city": "Hyderabad",
                    "state": "Telangana",
                    "country": "India",
                    "employment_type": "full_time",
                    "work_mode": "remote",
                    "min_exp": 4,
                    "max_exp": 8,
                    "min_sal": 1600000,
                    "max_sal": 2500000,
                    "currency": "INR",
                    "openings": 3,
                    "days_ago": 21,
                    "skills": ["Python", "FastAPI", "Docker", "AWS", "PostgreSQL"],
                    "desc": "Design and scale containerized backend services, automated CI/CD pipelines, and multi-region database replication.",
                },
                {
                    "title": "AI Platform & Python Engineer",
                    "company": companies[2],
                    "location": "Bengaluru, Karnataka",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "country": "India",
                    "employment_type": "full_time",
                    "work_mode": "hybrid",
                    "min_exp": 4,
                    "max_exp": 8,
                    "min_sal": 2200000,
                    "max_sal": 3200000,
                    "currency": "INR",
                    "openings": 2,
                    "days_ago": 10,
                    "skills": ["Python", "FastAPI", "Docker", "Redis"],
                    "desc": "Build high-throughput inference APIs and data pipelines connecting modern LLM foundations with candidate matching.",
                },
                {
                    "title": "Senior Fintech Backend Engineer",
                    "company": companies[3],
                    "location": "Mumbai, Maharashtra",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "country": "India",
                    "employment_type": "full_time",
                    "work_mode": "on_site",
                    "min_exp": 5,
                    "max_exp": 9,
                    "min_sal": 1900000,
                    "max_sal": 2900000,
                    "currency": "INR",
                    "openings": 1,
                    "days_ago": 25,
                    "skills": ["Python", "PostgreSQL", "Redis", "Docker"],
                    "desc": "Engineer secure, fault-tolerant financial settlement services and ledger systems for enterprise clients.",
                }
            ]

            created_jobs = []
            for spec in jobs_spec:
                posted = now - timedelta(days=spec["days_ago"])
                j = Job(
                    id=uuid.uuid4(),
                    company_id=spec["company"].id,
                    title=spec["title"],
                    description=spec["desc"],
                    description_summary=spec["desc"][:120],
                    responsibilities="Collaborate with engineering leadership, write clean testable code, and participate in architecture discussions.",
                    required_qualifications=f"{spec['min_exp']}+ years professional software development experience.",
                    preferred_qualifications="Bachelor's in CS or equivalent practical experience.",
                    benefits="Comprehensive health insurance, 401(k) matching, flexible PTO, home office stipend.",
                    location=spec["location"],
                    city=spec["city"],
                    state=spec["state"],
                    country=spec["country"],
                    employment_type=spec["employment_type"],
                    work_mode=spec["work_mode"],
                    minimum_experience=spec["min_exp"],
                    maximum_experience=spec["max_exp"],
                    minimum_salary=spec["min_sal"],
                    maximum_salary=spec["max_sal"],
                    currency=spec["currency"],
                    openings=spec["openings"],
                    application_deadline=now + timedelta(days=30),
                    status="published",
                    is_deleted=False,
                    posted_at=posted,
                    created_at=posted,
                    updated_at=posted
                )
                db.add(j)
                created_jobs.append(j)

                for sk_name in spec["skills"]:
                    if sk_name in skills:
                        js = JobSkill(job_id=j.id, skill_id=skills[sk_name].id, is_required=True)
                        db.add(js)
            db.flush()
        else:
            created_jobs = existing_jobs

        # 4. Standard candidate user (candidate@jobsterritory.com)
        candidate_user = db.query(User).filter_by(email="candidate@jobsterritory.com").first()
        if not candidate_user:
            print("Seeding base candidate@jobsterritory.com demo account...")
            candidate_user = User(
                id=uuid.uuid4(),
                email="candidate@jobsterritory.com",
                full_name="Alex Taylor",
                password_hash=hash_password("Password123!"),
                role="candidate",
                is_active=True,
                theme_preference="system",
                email_job_alerts=True,
                created_at=now - timedelta(days=60)
            )
            db.add(candidate_user)
            db.flush()

            # Profile
            profile = CandidateProfile(
                id=uuid.uuid4(),
                user_id=candidate_user.id,
                full_name="Alex Taylor",
                profile_initialized=True,
                phone_number="+1 (555) 234-5678",
                profile_headline="Senior Full Stack Software Engineer",
                professional_summary="Full Stack Engineer with 6+ years of experience building modern web apps, cloud native architectures, and scalable APIs using TypeScript, React, and Python.",
                current_location="San Francisco, CA",
                city="San Francisco",
                state="California",
                country="United States",
                linkedin_url="https://linkedin.com/in/alextaylor-demo",
                github_url="https://github.com/alextaylor-demo",
                portfolio_url="https://alextaylor.dev",
                total_experience=6,
                current_employment_status="employed",
                recruiter_visible=True,
                resume_visible=True,
                contact_visible=True
            )
            db.add(profile)

            # Preferences
            prefs = CandidatePreferences(
                id=uuid.uuid4(),
                candidate_id=candidate_user.id,
                preferred_job_titles=["Full Stack Engineer", "Frontend Lead", "Python Backend Developer"],
                preferred_locations=["Bengaluru, Karnataka", "Remote", "Hyderabad, Telangana"],
                preferred_work_modes=["remote", "hybrid"],
                preferred_employment_types=["full_time"],
                minimum_expected_salary=1800000,
                maximum_expected_salary=2800000,
                salary_currency="INR",
                willing_to_relocate=False,
                available_to_join="immediate"
            )
            db.add(prefs)

            # Skills
            for sk_name in ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Tailwind CSS"]:
                if sk_name in skills:
                    cs = CandidateSkill(
                        id=uuid.uuid4(),
                        candidate_id=candidate_user.id,
                        skill_id=skills[sk_name].id,
                        proficiency_level="expert"
                    )
                    db.add(cs)

            # Applications
            apps_spec = [
                (created_jobs[0], "shortlisted", 12),
                (created_jobs[1], "interview_scheduled", 6),
                (created_jobs[2], "under_review", 18),
                (created_jobs[3], "selected", 9),
                (created_jobs[4], "applied", 2),
            ]

            for job, status, days_ago in apps_spec:
                app_time = now - timedelta(days=days_ago)
                app_record = Application(
                    id=uuid.uuid4(),
                    candidate_id=candidate_user.id,
                    job_id=job.id,
                    status=status,
                    cover_letter="I am very excited about this role and feel my background aligns well with your team's mission.",
                    applied_at=app_time,
                    last_status_changed_at=app_time + timedelta(days=1),
                    created_at=app_time,
                    updated_at=app_time + timedelta(days=1)
                )
                db.add(app_record)
        else:
            candidate_user.password_hash = hash_password("Password123!")
            candidate_user.is_active = True

        db.commit()
        print("Base system data initialized.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding base data: {e}")
        raise
    finally:
        db.close()

    # Always guarantee demo@123 and demo@123.com are populated with complete fields
    try:
        from seed_demo_account import seed_demo
        seed_demo("demo@123")
        seed_demo("demo@123.com")
        print("demo@123 and demo@123.com accounts ready.")
    except Exception as e:
        print("Could not auto-seed demo@123:", e)

if __name__ == "__main__":
    seed()
