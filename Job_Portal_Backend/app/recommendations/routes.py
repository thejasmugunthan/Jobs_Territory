from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db
from app.dependencies import get_current_candidate
from app.matching.routes import norm
from app.models import (
    Application,
    CandidatePreferences,
    CandidateProfile,
    CandidateSkill,
    Company,
    Job,
    JobSkill,
    Skill,
    User,
)

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])
def configured_weights() -> dict[str, int]:
    settings = get_settings()
    return {"skills": settings.recommendation_skill_weight, "role": settings.recommendation_role_weight, "location": settings.recommendation_location_weight, "experience": settings.recommendation_experience_weight, "work": settings.recommendation_work_weight}
ROLE_ALIASES = {
    "software engineer": (
        "software developer",
        "backend developer",
        "frontend developer",
        "full stack developer",
    ),
    "product designer": ("ux designer", "ui designer", "ux/ui designer"),
}


def _role_score(preferred: list[str], title: str) -> int | None:
    if not preferred:
        return None
    title_norm = norm(title)
    aliases = []
    for item in preferred:
        aliases.append(norm(item))
        aliases.extend(
            norm(alias)
            for role, values in ROLE_ALIASES.items()
            if norm(item) == norm(role)
            for alias in values
        )
    title_tokens = f" {title_norm} "
    matches = any(
        value == title_norm or (len(value.split()) > 1 and f" {value} " in title_tokens)
        for value in aliases
    )
    return 100 if matches else 0


def _location_score(preferred: list[str], job: Job) -> int | None:
    if not preferred:
        return None
    mode = (job.work_mode or "").replace("_", "-").lower()
    job_location = " ".join(
        str(x or "") for x in (job.location, job.city, job.state, job.country)
    ).lower()
    if mode == "remote":
        return 100 if any(x.lower() == "remote" for x in preferred) else 0
    return (
        100
        if any(x.lower() != "remote" and x.lower() in job_location for x in preferred)
        else 0
    )


def build_recommendations(db: Session, user: User, page: int, limit: int) -> dict:
    prefs = db.scalar(
        select(CandidatePreferences).where(CandidatePreferences.candidate_id == user.id)
    )
    profile = db.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    candidate_skills = {
        norm(x)
        for x in db.scalars(
            select(Skill.name)
            .join(CandidateSkill, CandidateSkill.skill_id == Skill.id)
            .where(CandidateSkill.candidate_id == user.id)
        ).all()
    }
    applied = select(Application.job_id).where(Application.candidate_id == user.id)
    rows = db.execute(
        select(Job, Company)
        .join(Company, Company.id == Job.company_id)
        .where(
            Job.status == "published",
            Job.is_deleted.is_(False),
            Job.application_deadline.is_(None)
            | (Job.application_deadline >= date.today()),
            Job.id.not_in(applied),
        )
        .order_by(Job.posted_at.desc().nullslast(), Job.id)
        .limit(500)
    ).all()
    job_ids = [job.id for job, _ in rows]
    skill_map: dict = {job_id: [] for job_id in job_ids}
    if job_ids:
        for job_id, name, required in db.execute(
            select(JobSkill.job_id, Skill.name, JobSkill.is_required)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(JobSkill.job_id.in_(job_ids))
        ).all():
            skill_map[job_id].append({"name": name, "required": required})
    titles = prefs.preferred_job_titles if prefs else []
    locations = prefs.preferred_locations if prefs else []
    employment = prefs.preferred_employment_types if prefs else []
    work_modes = prefs.preferred_work_modes if prefs else []
    profile_exp = profile.total_experience if profile else None
    scored = []
    weights = configured_weights()
    for job, company in rows:
        skills = skill_map[job.id]
        required = [x["name"] for x in skills if x["required"]]
        preferred = [x["name"] for x in skills if not x["required"]]
        matched_required = [s for s in required if norm(s) in candidate_skills]
        matched_preferred = [s for s in preferred if norm(s) in candidate_skills]
        skill_score = (
            round(100 * len(matched_required) / len(required))
            if required and candidate_skills
            else None
        )
        role_score = _role_score(titles, job.title)
        location_score = _location_score(locations, job)
        exp_score = (
            None
            if profile_exp is None or job.minimum_experience is None
            else (
                100
                if profile_exp >= float(job.minimum_experience)
                else (
                    round(100 * profile_exp / float(job.minimum_experience))
                    if float(job.minimum_experience)
                    else 100
                )
            )
        )
        experience_level = (
            (prefs.preferred_experience_level or "").lower() if prefs else ""
        )
        level_ranges = {
            "entry": (0, 1),
            "junior": (1, 3),
            "mid": (3, 6),
            "mid-level": (3, 6),
            "senior": (5, 80),
            "lead": (8, 80),
        }
        if (
            exp_score is None
            and experience_level in level_ranges
            and job.minimum_experience is not None
            and job.maximum_experience is not None
        ):
            level_min, level_max = level_ranges[experience_level]
            exp_score = (
                100
                if float(job.minimum_experience) <= level_max
                and float(job.maximum_experience) >= level_min
                else 0
            )
        work_factors = []
        if employment:
            work_factors.append(
                100 if job.employment_type.replace("_", "-") in employment else 0
            )
        if work_modes:
            work_factors.append(
                100 if (job.work_mode or "").replace("_", "-") in work_modes else 0
            )
        expected_min = prefs.minimum_expected_salary if prefs else None
        expected_max = prefs.maximum_expected_salary if prefs else None
        if (
            (expected_min is not None or expected_max is not None)
            and (job.minimum_salary is not None or job.maximum_salary is not None)
            and prefs.salary_currency
            and job.currency
            and prefs.salary_currency.upper() == job.currency.upper()
        ):
            overlaps = (
                expected_max is None
                or job.minimum_salary is None
                or float(job.minimum_salary) <= float(expected_max)
            ) and (
                expected_min is None
                or job.maximum_salary is None
                or float(job.maximum_salary) >= float(expected_min)
            )
            work_factors.append(100 if overlaps else 0)
        work_score = (
            round(sum(work_factors) / len(work_factors)) if work_factors else None
        )
        parts = [
            (skill_score, weights["skills"]),
            (role_score, weights["role"]),
            (location_score, weights["location"]),
            (exp_score, weights["experience"]),
            (work_score, weights["work"]),
        ]
        available = [(value, weight) for value, weight in parts if value is not None]
        score = (
            round(
                sum(value * weight for value, weight in available)
                / sum(weight for _, weight in available)
            )
            if available
            else None
        )
        reasons = []
        if matched_required:
            reasons.append(f"Matches {len(matched_required)} required skill(s)")
        if role_score == 100:
            reasons.append("Matches a preferred role")
        if location_score == 100:
            reasons.append("Matches a preferred location")
        if exp_score == 100:
            reasons.append("Meets the minimum experience")
        if not reasons:
            reasons.append("Matches the available profile preferences")
        scored.append(
            {
                "job_id": str(job.id),
                "title": job.title,
                "company": company.name,
                "location": job.location
                or ", ".join(filter(None, [job.city, job.state, job.country])),
                "employment_type": job.employment_type,
                "work_mode": job.work_mode,
                "minimum_salary": (
                    float(job.minimum_salary)
                    if job.minimum_salary is not None
                    else None
                ),
                "maximum_salary": (
                    float(job.maximum_salary)
                    if job.maximum_salary is not None
                    else None
                ),
                "currency": job.currency,
                "recommendation_score": score,
                "data_completeness": round(sum(w for _, w in available) / sum(weights.values()) * 100),
                "reasons": reasons,
                "matched_skills": matched_required + matched_preferred,
                "missing_required_skills": [
                    s for s in required if norm(s) not in candidate_skills
                ],
                "missing_preferred_skills": [
                    s for s in preferred if norm(s) not in candidate_skills
                ],
            }
        )
    scored.sort(
        key=lambda x: (
            x["recommendation_score"] is not None,
            x["recommendation_score"] or 0,
            x["job_id"],
        ),
        reverse=True,
    )
    total = len(scored)
    start = (page - 1) * limit
    return {
        "items": scored[start : start + limit],
        "pagination": {
            "page": page,
            "page_size": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    }


@router.get("")
def recommendations(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    return build_recommendations(db, user, page, limit)


@router.get("/similar/{job_id}")
def similar_jobs(
    job_id: str,
    limit: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    from uuid import UUID

    from fastapi import HTTPException

    try:
        target_id = UUID(job_id)
    except ValueError:
        raise HTTPException(404, "Job not found") from None
    target = db.scalar(
        select(Job).where(
            Job.id == target_id, Job.status == "published", Job.is_deleted.is_(False)
        )
    )
    if not target:
        raise HTTPException(404, "Job not found")
    target_skills = {
        norm(x)
        for x in db.scalars(
            select(Skill.name)
            .join(JobSkill, JobSkill.skill_id == Skill.id)
            .where(JobSkill.job_id == target.id)
        ).all()
    }
    rows = db.execute(
        select(Job, Company)
        .join(Company, Company.id == Job.company_id)
        .where(
            Job.id != target.id,
            Job.status == "published",
            Job.is_deleted.is_(False),
            Job.application_deadline.is_(None)
            | (Job.application_deadline >= date.today()),
        )
        .order_by(Job.posted_at.desc().nullslast())
        .limit(200)
    ).all()
    ids = [job.id for job, _ in rows]
    skills: dict = {i: set() for i in ids}
    if ids:
        for jid, name in db.execute(
            select(JobSkill.job_id, Skill.name)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(JobSkill.job_id.in_(ids))
        ).all():
            skills[jid].add(norm(name))
    result = []
    for job, company in rows:
        shared = len(target_skills & skills[job.id])
        role = 1 if _role_score([target.title], job.title) == 100 else 0
        location = 1 if target.country and target.country == job.country else 0
        similarity = round(
            70 * shared / max(len(target_skills), 1) + 20 * role + 10 * location
        )
        if similarity:
            result.append(
                {
                    "job_id": str(job.id),
                    "title": job.title,
                    "company": company.name,
                    "location": job.location,
                    "similarity_score": similarity,
                }
            )
    result.sort(key=lambda x: (x["similarity_score"], x["job_id"]), reverse=True)
    return {"items": result[:limit]}
