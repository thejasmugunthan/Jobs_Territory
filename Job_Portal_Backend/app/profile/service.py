from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    CandidatePreferences,
    CandidateProfile,
    CandidateSkill,
    Certification,
    Education,
    Project,
    WorkExperience,
)

SECTION_WEIGHTS = {
    "basic_profile": 20,
    "professional_summary": 10,
    "education": 15,
    "work_experience": 15,
    "skills": 15,
    "projects": 10,
    "certifications": 5,
    "job_preferences": 10,
}


def calculate_profile_completion(db: Session, user_id: UUID) -> dict:
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user_id))
    populated_basics = 0
    if profile:
        populated_basics = sum(
            bool(value and str(value).strip())
            for value in (
                profile.full_name,
                profile.phone_number,
                profile.profile_headline,
                profile.current_location or profile.city,
                profile.country,
            )
        )
    pref = db.scalar(select(CandidatePreferences).where(CandidatePreferences.candidate_id == user_id))
    has_preferences = bool(
        pref
        and (
            pref.preferred_job_titles
            or pref.preferred_locations
            or pref.preferred_employment_types
            or pref.preferred_industries
        )
    )
    counts = db.execute(
        select(
            select(func.count()).select_from(Education).where(Education.candidate_id == user_id).scalar_subquery().label("education"),
            select(func.count()).select_from(WorkExperience).where(WorkExperience.candidate_id == user_id).scalar_subquery().label("work_experience"),
            select(func.count()).select_from(CandidateSkill).where(CandidateSkill.candidate_id == user_id).scalar_subquery().label("skills"),
            select(func.count()).select_from(Project).where(Project.candidate_id == user_id).scalar_subquery().label("projects"),
            select(func.count()).select_from(Certification).where(Certification.candidate_id == user_id).scalar_subquery().label("certifications"),
        )
    ).one()._mapping
    populated = {
        "basic_profile": (SECTION_WEIGHTS["basic_profile"] * populated_basics + 2) // 5,
        "professional_summary": SECTION_WEIGHTS["professional_summary"] if profile and profile.professional_summary and len(profile.professional_summary.strip()) >= 30 else 0,
        "education": SECTION_WEIGHTS["education"] if counts["education"] else 0,
        "work_experience": SECTION_WEIGHTS["work_experience"] if counts["work_experience"] else 0,
        "skills": SECTION_WEIGHTS["skills"] if counts["skills"] else 0,
        "projects": SECTION_WEIGHTS["projects"] if counts["projects"] else 0,
        "certifications": SECTION_WEIGHTS["certifications"] if counts["certifications"] else 0,
        "job_preferences": SECTION_WEIGHTS["job_preferences"] if has_preferences else 0,
    }
    completed = [key for key, weight in SECTION_WEIGHTS.items() if populated[key] == weight]
    incomplete = [key for key in SECTION_WEIGHTS if key not in completed]
    return {
        "completion_percentage": sum(populated.values()),
        "completed_sections": completed,
        "incomplete_sections": incomplete,
        "section_scores": populated,
    }
