# -*- coding: utf-8 -*-
import uuid, sys, hashlib
sys.path.insert(0, ".")
from datetime import datetime, timezone, timedelta, date
from app.database import SessionLocal
from app.models import (
    User, CandidateProfile, Company, Job, Skill, JobSkill, CandidateSkill,
    Application, ApplicationStatusHistory, CandidatePreferences,
    WorkExperience, Education, Project, Certification,
    SavedJob, RecentlyViewedJob, Resume, ResumeAnalysis, JobAlert, Notification, SupportRequest
)
from app.core.security import hash_password

def seed_demo(email_addr):
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        existing = db.query(User).filter_by(email=email_addr).first()
        if existing:
            existing.password_hash = hash_password("demo@123")
            existing.is_active = True
            candidate_user = existing
        else:
            candidate_user = User(
                id=uuid.uuid4(),
                email=email_addr,
                full_name="Alex Sharma",
                password_hash=hash_password("demo@123"),
                role="candidate",
                is_active=True,
                theme_preference="system",
                email_job_alerts=True,
                created_at=now - timedelta(days=90)
            )
            db.add(candidate_user)
            db.flush()

        uid = candidate_user.id

        # 1. Profile (Complete fields)
        prof = db.query(CandidateProfile).filter_by(user_id=uid).first()
        if not prof:
            prof = CandidateProfile(
                id=uuid.uuid4(),
                user_id=uid,
                full_name="Alex Sharma",
                profile_initialized=True,
                phone_number="+91 98765 43210",
                profile_headline="Senior Full Stack & Cloud Solutions Engineer",
                professional_summary="Passionate Full Stack Engineer with 6+ years of expertise in building enterprise web platforms, scalable REST APIs, microservices, and AI-driven applications using React, TypeScript, Python, FastAPI, and PostgreSQL. Experienced in distributed cloud infrastructure, CI/CD pipelines, and high-performance databases.",
                current_location="Bengaluru, Karnataka, India",
                city="Bengaluru",
                state="Karnataka",
                country="India",
                linkedin_url="https://linkedin.com/in/alex-sharma-tech",
                github_url="https://github.com/alex-sharma-dev",
                portfolio_url="https://alexsharma.dev",
                total_experience=6,
                current_employment_status="employed",
                recruiter_visible=True,
                resume_visible=True,
                contact_visible=True
            )
            db.add(prof)
        else:
            prof.full_name = "Alex Sharma"
            prof.profile_initialized = True
            prof.phone_number = "+91 98765 43210"
            prof.profile_headline = "Senior Full Stack & Cloud Solutions Engineer"
            prof.professional_summary = "Passionate Full Stack Engineer with 6+ years of expertise in building enterprise web platforms, scalable REST APIs, microservices, and AI-driven applications using React, TypeScript, Python, FastAPI, and PostgreSQL. Experienced in distributed cloud infrastructure, CI/CD pipelines, and high-performance databases."
            prof.current_location = "Bengaluru, Karnataka, India"
            prof.city = "Bengaluru"
            prof.state = "Karnataka"
            prof.country = "India"
            prof.linkedin_url = "https://linkedin.com/in/alex-sharma-tech"
            prof.github_url = "https://github.com/alex-sharma-dev"
            prof.portfolio_url = "https://alexsharma.dev"
            prof.total_experience = 6
            prof.current_employment_status = "employed"
            prof.recruiter_visible = True
            prof.resume_visible = True
            prof.contact_visible = True

        # 2. Preferences (in INR)
        pref = db.query(CandidatePreferences).filter_by(candidate_id=uid).first()
        if not pref:
            pref = CandidatePreferences(
                id=uuid.uuid4(),
                candidate_id=uid,
                preferred_job_titles=["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer", "AI Platform Engineer", "Cloud Architect"],
                preferred_locations=["Bengaluru, Karnataka", "Remote", "Hyderabad, Telangana", "Mumbai, Maharashtra"],
                preferred_work_modes=["remote", "hybrid"],
                preferred_employment_types=["full_time"],
                minimum_expected_salary=2000000,
                maximum_expected_salary=3200000,
                salary_currency="INR",
                preferred_experience_level="senior",
                preferred_industries=["Information Technology", "Fintech", "Artificial Intelligence & Analytics"],
                willing_to_relocate=True,
                available_to_join="Immediate (15 days notice)"
            )
            db.add(pref)
        else:
            pref.preferred_job_titles = ["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer", "AI Platform Engineer", "Cloud Architect"]
            pref.preferred_locations = ["Bengaluru, Karnataka", "Remote", "Hyderabad, Telangana", "Mumbai, Maharashtra"]
            pref.preferred_work_modes = ["remote", "hybrid"]
            pref.preferred_employment_types = ["full_time"]
            pref.minimum_expected_salary = 2000000
            pref.maximum_expected_salary = 3200000
            pref.salary_currency = "INR"
            pref.preferred_experience_level = "senior"
            pref.preferred_industries = ["Information Technology", "Fintech", "Artificial Intelligence & Analytics"]
            pref.willing_to_relocate = True
            pref.available_to_join = "Immediate (15 days notice)"

        # 3. Work Experience (3 records)
        db.query(WorkExperience).filter_by(candidate_id=uid).delete()
        exp1 = WorkExperience(
            id=uuid.uuid4(),
            candidate_id=uid,
            company_name="Jobs Territory Labs",
            job_title="Senior Software Engineer",
            employment_type="full-time",
            location="Bengaluru, Karnataka",
            start_date=date(2023, 1, 15),
            end_date=None,
            currently_working=True,
            description="Leading modern candidate matching engine and full-stack web features.",
            responsibilities=[
                "Architected reactive candidate dashboard and AI match analysis using React and Tailwind CSS",
                "Optimized high-volume REST and aggregation endpoints in FastAPI with sub-80ms response times",
                "Mentored 4 software engineers on TypeScript, code quality, and test-driven development"
            ]
        )
        exp2 = WorkExperience(
            id=uuid.uuid4(),
            candidate_id=uid,
            company_name="CloudScale Systems",
            job_title="Full Stack Engineer",
            employment_type="full-time",
            location="Hyderabad, Telangana",
            start_date=date(2021, 1, 10),
            end_date=date(2022, 12, 31),
            currently_working=False,
            description="Engineered scalable cloud services and interactive web portals.",
            responsibilities=[
                "Developed distributed event processors and background worker queues in Python",
                "Built accessible UI component libraries and design systems in React and TypeScript",
                "Containerized microservices using Docker and automated CI/CD GitHub Actions workflows"
            ]
        )
        exp3 = WorkExperience(
            id=uuid.uuid4(),
            candidate_id=uid,
            company_name="RazorPay Technologies",
            job_title="Junior Software Engineer",
            employment_type="full-time",
            location="Bengaluru, Karnataka",
            start_date=date(2019, 7, 1),
            end_date=date(2020, 12, 20),
            currently_working=False,
            description="Contributed to core payment integration APIs and checkout SDKs.",
            responsibilities=[
                "Maintained RESTful checkout microservices with 99.99% uptime",
                "Implemented secure webhook verification and retry policies in Python"
            ]
        )
        db.add_all([exp1, exp2, exp3])

        # 4. Education (2 records)
        db.query(Education).filter_by(candidate_id=uid).delete()
        edu1 = Education(
            id=uuid.uuid4(),
            candidate_id=uid,
            institution_name="National Institute of Technology (NIT) Karnataka",
            degree="Bachelor of Technology (B.Tech)",
            field_of_study="Computer Science & Engineering",
            start_date=date(2015, 8, 1),
            end_date=date(2019, 5, 30),
            is_currently_studying=False,
            grade="8.9 / 10 CGPA",
            description="Graduated with Distinction. Coursework in Distributed Systems, Algorithms, Cloud Computing, and DBMS."
        )
        edu2 = Education(
            id=uuid.uuid4(),
            candidate_id=uid,
            institution_name="Indian Institute of Science (IISc)",
            degree="Post-Graduate Certification",
            field_of_study="Cloud Architecture & Artificial Intelligence",
            start_date=date(2021, 6, 1),
            end_date=date(2022, 3, 15),
            is_currently_studying=False,
            grade="A+ Grade",
            description="Advanced studies in scalable machine learning deployments and distributed systems."
        )
        db.add_all([edu1, edu2])

        # 5. Skills (12 skills)
        all_skills = db.query(Skill).all()
        skill_map = {s.name: s for s in all_skills}
        required_skills = ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "Tailwind CSS", "Redis", "AWS", "Kubernetes", "GraphQL", "Next.js"]
        for sname in required_skills:
            if sname not in skill_map:
                sk = Skill(id=uuid.uuid4(), name=sname, category="Engineering")
                db.add(sk)
                db.flush()
                skill_map[sname] = sk

        db.query(CandidateSkill).filter_by(candidate_id=uid).delete()
        for idx, sname in enumerate(required_skills):
            level = "expert" if idx < 5 else "advanced"
            cs = CandidateSkill(
                id=uuid.uuid4(),
                candidate_id=uid,
                skill_id=skill_map[sname].id,
                proficiency_level=level
            )
            db.add(cs)

        # 6. Projects (3 records)
        db.query(Project).filter_by(candidate_id=uid).delete()
        proj1 = Project(
            id=uuid.uuid4(),
            candidate_id=uid,
            project_name="Smart Candidate Career Portal & Analytics",
            description="Comprehensive candidate job hunting ecosystem featuring AI match metrics, real-time stage tracking, and interactive salary insights.",
            technologies_used=["React", "TypeScript", "FastAPI", "PostgreSQL", "Tailwind CSS"],
            project_url="https://jobsterritory.com",
            repository_url="https://github.com/thejasmugunthan/Jobs_Territory",
            start_date=date(2024, 1, 1),
            end_date=None,
            is_ongoing=True
        )
        proj2 = Project(
            id=uuid.uuid4(),
            candidate_id=uid,
            project_name="High-Concurrency Real-time Settlement Ledger",
            description="Financial transaction engine supporting idempotent ledger writes, optimistic locking, and zero-loss reconciliations.",
            technologies_used=["Python", "FastAPI", "Redis", "PostgreSQL", "Docker"],
            project_url="https://ledger.demo.jobsterritory.com",
            repository_url="https://github.com/alex-sharma-dev/settlement-ledger",
            start_date=date(2022, 3, 1),
            end_date=date(2023, 2, 28),
            is_ongoing=False
        )
        proj3 = Project(
            id=uuid.uuid4(),
            candidate_id=uid,
            project_name="AI Resume Parser & Skills Matcher",
            description="Deep NLP extraction pipeline for PDF resumes that categorizes technical proficiencies and predicts hiring match score.",
            technologies_used=["Python", "spaCy", "FastAPI", "Docker", "PyMuPDF"],
            project_url="https://ai-resume.jobsterritory.com",
            repository_url="https://github.com/alex-sharma-dev/resume-nlp-matcher",
            start_date=date(2023, 4, 1),
            end_date=date(2023, 11, 30),
            is_ongoing=False
        )
        db.add_all([proj1, proj2, proj3])

        # 7. Certifications (3 records)
        db.query(Certification).filter_by(candidate_id=uid).delete()
        cert1 = Certification(
            id=uuid.uuid4(),
            candidate_id=uid,
            certification_name="AWS Certified Solutions Architect - Associate",
            issuing_organization="Amazon Web Services (AWS)",
            issue_date=date(2023, 4, 15),
            expiration_date=date(2026, 4, 15),
            credential_id="AWS-ARCH-8849102",
            credential_url="https://aws.amazon.com/verification",
            does_not_expire=False
        )
        cert2 = Certification(
            id=uuid.uuid4(),
            candidate_id=uid,
            certification_name="Professional Scrum Master I (PSM I)",
            issuing_organization="Scrum.org",
            issue_date=date(2022, 8, 20),
            expiration_date=None,
            credential_id="PSM-991823",
            credential_url="https://scrum.org/certificates/991823",
            does_not_expire=True
        )
        cert3 = Certification(
            id=uuid.uuid4(),
            candidate_id=uid,
            certification_name="Certified Kubernetes Administrator (CKA)",
            issuing_organization="Cloud Native Computing Foundation (CNCF)",
            issue_date=date(2023, 10, 5),
            expiration_date=date(2026, 10, 5),
            credential_id="CKA-294812",
            credential_url="https://www.cncf.io/certification/cka/",
            does_not_expire=False
        )
        db.add_all([cert1, cert2, cert3])

        # 8. Resume & Analysis
        db.query(ResumeAnalysis).filter_by(candidate_id=uid).delete()
        db.query(Resume).filter_by(candidate_id=uid).delete()
        resume_record = Resume(
            id=uuid.uuid4(),
            candidate_id=uid,
            original_filename="Alex_Sharma_Senior_FullStack_Resume.pdf",
            storage_path=f"resumes/{uid}/Alex_Sharma_Resume.pdf",
            file_size=245800,
            mime_type="application/pdf",
            sha256=hashlib.sha256(b"dummy_resume_content_alex_sharma_full").hexdigest(),
            processing_status="analyzed",
            is_current=True,
            uploaded_at=now - timedelta(days=10)
        )
        db.add(resume_record)
        db.flush()

        analysis_record = ResumeAnalysis(
            id=uuid.uuid4(),
            resume_id=resume_record.id,
            candidate_id=uid,
            version=1,
            skills=[
                {"name": "React", "category": "Frontend", "confidence": 0.96},
                {"name": "TypeScript", "category": "Frontend", "confidence": 0.94},
                {"name": "Python", "category": "Backend", "confidence": 0.95},
                {"name": "FastAPI", "category": "Backend", "confidence": 0.92},
                {"name": "PostgreSQL", "category": "Database", "confidence": 0.90},
                {"name": "Docker", "category": "DevOps", "confidence": 0.88},
                {"name": "Tailwind CSS", "category": "Frontend", "confidence": 0.95},
                {"name": "AWS", "category": "Cloud", "confidence": 0.85},
            ],
            education=[
                {"institution": "National Institute of Technology (NIT) Karnataka", "degree": "Bachelor of Technology (B.Tech)", "year": "2019"}
            ],
            experience=[
                {"title": "Senior Software Engineer", "company": "Jobs Territory Labs", "duration": "2023 - Present"},
                {"title": "Full Stack Engineer", "company": "CloudScale Systems", "duration": "2021 - 2022"}
            ],
            projects=[
                {"name": "Smart Candidate Career Portal & Analytics", "role": "Lead Architect"},
                {"name": "High-Concurrency Real-time Settlement Ledger", "role": "Backend Engineer"}
            ],
            certifications=[
                {"name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services"}
            ],
            extraction_metadata={
                "overall_score": 92,
                "summary_strength": 90,
                "experience_strength": 95,
                "skill_strength": 94,
                "education_strength": 90,
                "suggestions": [
                    "Highlight cloud cost reduction metrics achieved during architectural refactoring.",
                    "Include open-source repository contributions to demonstrate community impact.",
                    "Detail experience with Kubernetes orchestration to strengthen Cloud Architect profile."
                ]
            },
            processing_status="completed",
            analyzed_at=now - timedelta(days=10)
        )
        db.add(analysis_record)

        # 9. Applications (across published jobs)
        jobs = db.query(Job).filter_by(status="published", is_deleted=False).all()
        db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id.in_(
            db.query(Application.id).filter_by(candidate_id=uid)
        )).delete(synchronize_session=False)
        db.query(Application).filter_by(candidate_id=uid).delete()

        status_cycle = ["selected", "interview_scheduled", "shortlisted", "under_review", "applied"]
        for idx, j in enumerate(jobs[:5]):
            st = status_cycle[idx % len(status_cycle)]
            app_time = now - timedelta(days=(idx + 1) * 3)
            app = Application(
                id=uuid.uuid4(),
                candidate_id=uid,
                job_id=j.id,
                status=st,
                cover_letter=f"Dear Hiring Team, I am excited to apply for the {j.title} position. My 6+ years of expertise in TypeScript, React, and Python make me an ideal contributor to your technical mission.",
                resume_filename="Alex_Sharma_Senior_FullStack_Resume.pdf",
                resume_storage_path=resume_record.storage_path,
                resume_content_type="application/pdf",
                resume_size_bytes=245800,
                applied_at=app_time,
                last_status_changed_at=now - timedelta(hours=6),
                created_at=app_time,
                updated_at=now - timedelta(hours=6)
            )
            db.add(app)
            db.flush()

            hist = ApplicationStatusHistory(
                id=uuid.uuid4(),
                application_id=app.id,
                previous_status="applied" if st != "applied" else None,
                new_status=st,
                changed_by=None,
                description=f"Candidate stage advanced to {st.replace('_', ' ').capitalize()}"
            )
            db.add(hist)

        # 10. Saved Jobs (3 bookmarks)
        db.query(SavedJob).filter_by(candidate_id=uid).delete()
        for j in jobs[1:4]:
            db.add(SavedJob(
                id=uuid.uuid4(),
                candidate_id=uid,
                job_id=j.id,
                saved_at=now - timedelta(days=2)
            ))

        # 11. Recently Viewed Jobs (4 records)
        db.query(RecentlyViewedJob).filter_by(candidate_id=uid).delete()
        for idx, j in enumerate(jobs[:4]):
            db.add(RecentlyViewedJob(
                id=uuid.uuid4(),
                candidate_id=uid,
                job_id=j.id,
                viewed_at=now - timedelta(hours=(idx + 1) * 4),
                view_count=idx + 1
            ))

        # 12. Job Alert
        db.query(JobAlert).filter_by(candidate_id=uid).delete()
        alert = JobAlert(
            id=uuid.uuid4(),
            candidate_id=uid,
            name="Senior Engineering Roles (Bengaluru / Remote)",
            titles=["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer"],
            skills=["React", "TypeScript", "Python", "FastAPI"],
            locations=["Bengaluru, Karnataka", "Remote"],
            employment_types=["full_time"],
            work_modes=["remote", "hybrid"],
            minimum_experience=4,
            experience_level="senior",
            minimum_salary=2000000,
            maximum_salary=3200000,
            salary_currency="INR",
            frequency="daily",
            is_active=True
        )
        db.add(alert)

        # 13. Notifications (5 items)
        db.query(Notification).filter_by(candidate_id=uid).delete()
        notifs = [
            Notification(
                id=uuid.uuid4(),
                candidate_id=uid,
                notification_type="selected",
                title="Congratulations! Offer Received",
                message="Jobs Territory Labs has extended an offer for the Lead Frontend Architect position. Review your offer details.",
                job_id=jobs[0].id if jobs else None,
                deduplication_key=f"offer_rec_{uid}_1",
                is_read=False,
                created_at=now - timedelta(hours=2)
            ),
            Notification(
                id=uuid.uuid4(),
                candidate_id=uid,
                notification_type="interview_scheduled",
                title="Interview Scheduled: Technical Architecture Round",
                message="Your video interview with CloudScale Systems is scheduled for Friday at 2:30 PM IST.",
                job_id=jobs[1].id if len(jobs) > 1 else None,
                deduplication_key=f"interview_sch_{uid}_2",
                is_read=False,
                created_at=now - timedelta(hours=14)
            ),
            Notification(
                id=uuid.uuid4(),
                candidate_id=uid,
                notification_type="shortlisted",
                title="Application Shortlisted!",
                message="Your application for Senior Full Stack Engineer has been shortlisted by the engineering hiring team.",
                job_id=jobs[2].id if len(jobs) > 2 else None,
                deduplication_key=f"shortlist_{uid}_3",
                is_read=True,
                created_at=now - timedelta(days=1)
            ),
            Notification(
                id=uuid.uuid4(),
                candidate_id=uid,
                notification_type="alert_match",
                title="3 New Jobs Match Your Alert",
                message="New positions matching 'Senior Engineering Roles' in Bengaluru have been published today.",
                job_id=None,
                deduplication_key=f"alert_match_{uid}_4",
                is_read=True,
                created_at=now - timedelta(days=2)
            ),
            Notification(
                id=uuid.uuid4(),
                candidate_id=uid,
                notification_type="application_status",
                title="Application Submitted Successfully",
                message="Your profile and resume were forwarded to FinVantage Capital for Senior Fintech Backend Engineer.",
                job_id=jobs[3].id if len(jobs) > 3 else None,
                deduplication_key=f"app_sub_{uid}_5",
                is_read=True,
                created_at=now - timedelta(days=3)
            )
        ]
        db.add_all(notifs)

        db.commit()
        print(f"Successfully seeded complete candidate data for {email_addr}!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding {email_addr}: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo("demo@123")
    seed_demo("demo@123.com")
