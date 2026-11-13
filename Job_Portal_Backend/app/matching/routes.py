import hashlib
import json
import re
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_candidate
from app.models import (
    CandidateProfile,
    CandidateSkill,
    Education,
    Job,
    JobMatchCache,
    JobSkill,
    Skill,
    User,
    WorkExperience,
)

router = APIRouter(prefix="/api/v1/jobs", tags=["job matching"])
ALIASES = {
    "js": "javascript",
    "react.js": "react",
    "reactjs": "react",
    "postgres": "postgresql",
    "node": "node.js",
    "nodejs": "node.js",
}
WEIGHTS = {"skills": 60, "experience": 25, "education": 15}


def calculate_overall_score(
    skill_score: int | None,
    experience_score: int | None,
    education_score: int | None,
    relevant: tuple[bool, bool, bool] = (True, True, True),
) -> tuple[int | None, int]:
    values = [
        (skill_score, WEIGHTS["skills"]),
        (experience_score, WEIGHTS["experience"]),
        (education_score, WEIGHTS["education"]),
    ]
    available = [
        (max(0, min(100, value)), weight)
        for value, weight in values
        if value is not None
    ]
    overall = (
        round(
            sum(value * weight for value, weight in available)
            / sum(weight for _, weight in available)
        )
        if available
        else None
    )
    relevant_weights = [
        weight for (_, weight), is_relevant in zip(values, relevant) if is_relevant
    ]
    present_weights = [
        weight
        for (value, weight), is_relevant in zip(values, relevant)
        if is_relevant and value is not None
    ]
    completeness = (
        round(sum(present_weights) / sum(relevant_weights) * 100)
        if relevant_weights
        else 100
    )
    return overall, completeness


def norm(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip().lower())
    return ALIASES.get(value, value)


def score_match(db: Session, job: Job, candidate_id: UUID) -> tuple[dict, str]:
    candidate_skill_rows = db.execute(
        select(Skill.name)
        .join(CandidateSkill, CandidateSkill.skill_id == Skill.id)
        .where(CandidateSkill.candidate_id == candidate_id)
    ).all()
    candidate_skills = {norm(row[0]) for row in candidate_skill_rows}
    job_skill_rows = db.execute(
        select(Skill.name, JobSkill.is_required)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .where(JobSkill.job_id == job.id)
    ).all()
    required = [name for name, is_required in job_skill_rows if is_required]
    preferred = [name for name, is_required in job_skill_rows if not is_required]
    matched_required = [s for s in required if norm(s) in candidate_skills]
    missing_required = [s for s in required if norm(s) not in candidate_skills]
    matched_preferred = [s for s in preferred if norm(s) in candidate_skills]
    missing_preferred = [s for s in preferred if norm(s) not in candidate_skills]
    skill_score = (
        round(100 * len(matched_required) / len(required))
        if required and candidate_skills
        else None
    )

    profile = db.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == candidate_id)
    )
    verified_experience = (
        profile.total_experience
        if profile and profile.total_experience is not None
        else None
    )
    if verified_experience is None:
        records = db.scalars(
            select(WorkExperience).where(
                WorkExperience.candidate_id == candidate_id,
                WorkExperience.employment_type != "internship",
            )
        ).all()
        intervals = []
        for row in records:
            if row.start_date:
                intervals.append((row.start_date, row.end_date or date.today()))
        intervals.sort()
        merged = []
        for start, end in intervals:
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))
        if merged:
            verified_experience = round(
                sum((end - start).days for start, end in merged) / 365.25, 1
            )
    minimum = (
        float(job.minimum_experience) if job.minimum_experience is not None else None
    )
    exp_score = (
        None
        if minimum is None or verified_experience is None
        else (
            100
            if minimum <= 0 or verified_experience >= minimum
            else round(100 * verified_experience / minimum)
        )
    )

    qualifications = [str(q) for q in (job.required_qualifications or [])]
    edu_req = next(
        (
            q
            for q in qualifications
            if re.search(
                r"\b(bachelor|bachelor's|b\.s\.|b\.tech|b\.e\.|master|master's|m\.s\.|m\.tech|ph\.d|doctorate)\b",
                q,
                re.IGNORECASE,
            )
        ),
        None,
    )
    candidate_education = db.scalars(
        select(Education).where(Education.candidate_id == candidate_id)
    ).all()
    edu_score = None
    edu_met = None
    if edu_req and candidate_education:
        req = norm(edu_req)
        degree_rank = {
            "bachelor": 1,
            "bachelor's": 1,
            "b.tech": 1,
            "b.e.": 1,
            "b.s.": 1,
            "master": 2,
            "master's": 2,
            "m.s.": 2,
            "m.tech": 2,
            "ph.d": 3,
            "doctorate": 3,
        }
        req_rank = max(
            (rank for key, rank in degree_rank.items() if key in req), default=1
        )
        candidates = [norm(e.degree) for e in candidate_education]
        ranks = [
            max((rank for key, rank in degree_rank.items() if key in d), default=0)
            for d in candidates
        ]
        edu_met = max(ranks, default=0) >= req_rank
        edu_score = 100 if edu_met else 0

    overall, completeness = calculate_overall_score(
        skill_score,
        exp_score,
        edu_score,
        relevant=(bool(required), minimum is not None, edu_req is not None),
    )
    suggestions = []
    for skill in missing_required:
        suggestions.append(
            f"Build practical experience with {skill} through a focused project or course."
        )
    for skill in missing_preferred:
        suggestions.append(
            f"Consider developing {skill}, a preferred skill for this role."
        )
    explanations = []
    explanations.append(
        f"Matched {len(matched_required)} of {len(required)} required skills."
        if required
        else "This job has no structured required skills, so skill score is not applicable."
    )
    explanations.append(
        "The candidate meets the stated experience minimum."
        if exp_score == 100
        else (
            "The candidate is below the stated experience minimum."
            if exp_score is not None
            else "Experience comparison is unavailable because verified experience or a job minimum is missing."
        )
    )
    explanations.append(
        "Education meets the stated requirement."
        if edu_met is True
        else (
            "Education does not meet the stated requirement."
            if edu_met is False
            else "No explicit education requirement was found."
        )
    )
    result = {
        "job_id": str(job.id),
        "overall_compatibility_score": overall,
        "skill_match_percentage": skill_score,
        "experience_match_percentage": exp_score,
        "education_match_percentage": edu_score,
        "data_completeness": completeness,
        "matched_skills": matched_required,
        "matched_preferred_skills": matched_preferred,
        "missing_required_skills": missing_required,
        "missing_preferred_skills": missing_preferred,
        "candidate_experience_years": verified_experience,
        "required_experience_years": minimum,
        "education_requirement": edu_req,
        "education_met": edu_met,
        "score_breakdown": {
            "skills": {"score": skill_score, "weight": 60},
            "experience": {"score": exp_score, "weight": 25},
            "education": {"score": edu_score, "weight": 15},
            "missing_data_strategy": "Renormalize available category weights.",
        },
        "explanation": explanations,
        "improvement_suggestions": suggestions,
        "disclaimer": "Compatibility estimate based on confirmed profile data; it is not a prediction of hiring success.",
    }
    payload = {
        "job": {
            "id": str(job.id),
            "title": job.title,
            "company_id": str(job.company_id),
            "location": job.location,
        },
        "candidate_skills": sorted(candidate_skills),
        "required": required,
        "preferred": preferred,
        "experience": verified_experience,
        "minimum": minimum,
        "education": [e.degree for e in candidate_education],
        "qualifications": qualifications,
    }
    fingerprint = hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()
    return result, fingerprint


@router.get("/{job_id}/match")
def get_job_match(
    job_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_candidate),
):
    job = db.scalar(
        select(Job).where(
            Job.id == job_id, Job.status == "published", Job.is_deleted.is_(False)
        )
    )
    if job is None:
        raise HTTPException(404, "Job not found")
    result, fingerprint = score_match(db, job, user.id)
    cache = db.scalar(
        select(JobMatchCache).where(
            JobMatchCache.candidate_id == user.id, JobMatchCache.job_id == job.id
        )
    )
    if cache and cache.input_hash == fingerprint:
        return cache.result
    if cache:
        cache.input_hash, cache.result = fingerprint, result
    else:
        db.add(
            JobMatchCache(
                candidate_id=user.id,
                job_id=job.id,
                input_hash=fingerprint,
                result=result,
            )
        )
    db.commit()
    return result
