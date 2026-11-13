def signup(client, email="candidate@example.com"):
    client.post("/api/v1/auth/register", json={"full_name": "Casey Candidate", "email": email, "password": "StrongPassword123"})
    result = client.post("/api/v1/auth/login", json={"email": email, "password": "StrongPassword123"})
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_profile_auth_post_get_patch_and_completion(client):
    headers = signup(client)
    assert client.get("/api/v1/profile/me").status_code == 401
    created = client.post(
        "/api/v1/profile",
        headers=headers,
        json={"full_name": "Casey Candidate", "phone_number": "+14155552671", "profile_headline": "Backend Engineer", "professional_summary": "Experienced engineer building reliable production web systems and APIs.", "country": "United States"},
    )
    assert created.status_code == 201
    assert created.json()["success"] is True
    assert client.post("/api/v1/profile", headers=headers, json={"full_name": "Casey Candidate"}).status_code == 409
    assert client.get("/api/v1/profile/me", headers=headers).status_code == 200
    updated = client.patch("/api/v1/profile/me", headers=headers, json={"phone_number": None, "city": "San Francisco"})
    assert updated.status_code == 200
    assert updated.json()["data"]["phone_number"] is None
    assert updated.json()["data"]["city"] == "San Francisco"
    completion = client.get("/api/v1/profile/completion", headers=headers).json()["data"]
    assert completion["completion_percentage"] == 26
    assert sum(completion["section_scores"].values()) == completion["completion_percentage"]


def test_empty_registered_candidate_gets_partial_completion_only_for_account_name(client):
    headers = signup(client)
    result = client.get("/api/v1/profile/completion", headers=headers).json()["data"]
    assert result["completion_percentage"] == 4
    assert result["section_scores"]["education"] == 0
    assert result["section_scores"]["skills"] == 0


def test_profile_completion_reaches_100_from_populated_database_sections(client):
    headers = signup(client)
    assert client.patch(
        "/api/v1/profile/me",
        headers=headers,
        json={"phone_number": "+14155552671", "profile_headline": "Backend Engineer", "current_location": "Remote", "country": "United States", "professional_summary": "Experienced engineer building reliable production web systems and APIs."},
    ).status_code == 200
    assert client.post("/api/v1/profile/education", headers=headers, json={"institution_name": "University", "degree": "BS", "start_date": "2020-01-01", "is_currently_studying": True}).status_code == 201
    assert client.post("/api/v1/profile/experience", headers=headers, json={"company_name": "Example", "job_title": "Engineer", "employment_type": "full-time", "start_date": "2022-01-01", "currently_working": True}).status_code == 201
    skill = client.get("/api/v1/profile/skills/catalog?search=Python", headers=headers).json()["data"][0]
    assert client.post("/api/v1/profile/skills", headers=headers, json={"skill_id": skill["id"], "proficiency_level": "advanced"}).status_code == 201
    assert client.post("/api/v1/profile/projects", headers=headers, json={"project_name": "Portfolio API", "technologies_used": ["Python"], "is_ongoing": True}).status_code == 201
    assert client.post("/api/v1/profile/certifications", headers=headers, json={"certification_name": "Certificate", "issuing_organization": "Example", "issue_date": "2024-01-01", "does_not_expire": True}).status_code == 201
    assert client.put("/api/v1/profile/preferences", headers=headers, json={"preferred_job_titles": ["Engineer"]}).status_code == 200
    result = client.get("/api/v1/profile/completion", headers=headers).json()["data"]
    assert result["completion_percentage"] == 100
    assert len(result["completed_sections"]) == 8


def test_education_crud_and_cross_candidate_access(client):
    first_headers = signup(client, "first@example.com")
    second_headers = signup(client, "second@example.com")
    payload = {"institution_name": "University", "degree": "BS", "field_of_study": "Computer Science", "start_date": "2020-09-01", "end_date": "2024-05-30", "is_currently_studying": False}
    created = client.post("/api/v1/profile/education", headers=first_headers, json=payload)
    assert created.status_code == 201
    row_id = created.json()["data"]["id"]
    assert client.get(f"/api/v1/profile/education/{row_id}", headers=second_headers).status_code == 404
    assert client.patch(f"/api/v1/profile/education/{row_id}", headers=second_headers, json={"degree": "PhD"}).status_code == 404
    assert client.patch(f"/api/v1/profile/education/{row_id}", headers=first_headers, json={"end_date": "2019-01-01"}).status_code == 422
    assert client.patch(f"/api/v1/profile/education/{row_id}", headers=first_headers, json={"degree": "MS"}).json()["data"]["degree"] == "MS"
    assert client.delete(f"/api/v1/profile/education/{row_id}", headers=first_headers).status_code == 204
    assert client.get("/api/v1/profile/education", headers=first_headers).json()["data"] == []


def test_experience_validation_and_crud(client):
    headers = signup(client)
    payload = {"company_name": "Example Inc", "job_title": "Engineer", "employment_type": "full-time", "start_date": "2022-01-01", "currently_working": True, "responsibilities": ["Built APIs"]}
    created = client.post("/api/v1/profile/experience", headers=headers, json=payload)
    assert created.status_code == 201
    row_id = created.json()["data"]["id"]
    assert client.get("/api/v1/profile/experience", headers=headers).json()["data"]
    assert client.get(f"/api/v1/profile/experience/{row_id}", headers=headers).status_code == 200
    assert client.patch(f"/api/v1/profile/experience/{row_id}", headers=headers, json={"job_title": "Senior Engineer"}).status_code == 200
    assert client.patch(f"/api/v1/profile/experience/{row_id}", headers=headers, json={"currently_working": False, "end_date": "2021-01-01"}).status_code == 422
    assert client.delete(f"/api/v1/profile/experience/{row_id}", headers=headers).status_code == 204
    payload["end_date"] = "2023-01-01"
    assert client.post("/api/v1/profile/experience", headers=headers, json=payload).status_code == 422


def test_skill_catalog_assignment_duplicate_and_removal(client):
    headers = signup(client)
    rows = client.get("/api/v1/profile/skills/catalog?search=Python", headers=headers).json()["data"]
    assert rows
    skill_id = rows[0]["id"]
    assert client.post("/api/v1/profile/skills", headers=headers, json={"skill_id": skill_id, "proficiency_level": "advanced"}).status_code == 201
    assert client.post("/api/v1/profile/skills", headers=headers, json={"skill_id": skill_id, "proficiency_level": "expert"}).status_code == 409
    assert client.patch(f"/api/v1/profile/skills/{skill_id}", headers=headers, json={"proficiency_level": "expert"}).status_code == 200
    assert client.delete(f"/api/v1/profile/skills/{skill_id}", headers=headers).status_code == 204
    assert client.post("/api/v1/profile/skills", headers=headers, json={"skill_id": "00000000-0000-0000-0000-000000000001", "proficiency_level": "beginner"}).status_code == 404


def test_projects_certifications_and_preferences(client):
    headers = signup(client)
    project = {"project_name": "API", "description": "A sample project", "technologies_used": ["Python", "FastAPI"], "project_url": "https://example.com", "start_date": "2024-01-01", "is_ongoing": True}
    created = client.post("/api/v1/profile/projects", headers=headers, json=project)
    assert created.status_code == 201
    project_id = created.json()["data"]["id"]
    assert client.get("/api/v1/profile/projects", headers=headers).json()["data"]
    assert client.get(f"/api/v1/profile/projects/{project_id}", headers=headers).status_code == 200
    assert client.patch(f"/api/v1/profile/projects/{project_id}", headers=headers, json={"end_date": "2024-03-01"}).status_code == 422
    assert client.patch(f"/api/v1/profile/projects/{project_id}", headers=headers, json={"description": "Updated project description"}).status_code == 200
    assert client.delete(f"/api/v1/profile/projects/{project_id}", headers=headers).status_code == 204
    cert = {"certification_name": "Cloud Certificate", "issuing_organization": "Example Org", "issue_date": "2024-01-01", "does_not_expire": True}
    cert_created = client.post("/api/v1/profile/certifications", headers=headers, json=cert)
    assert cert_created.status_code == 201
    cert_id = cert_created.json()["data"]["id"]
    assert client.get("/api/v1/profile/certifications", headers=headers).json()["data"]
    assert client.get(f"/api/v1/profile/certifications/{cert_id}", headers=headers).status_code == 200
    assert client.patch(f"/api/v1/profile/certifications/{cert_id}", headers=headers, json={"credential_id": "CERT-123"}).status_code == 200
    assert client.delete(f"/api/v1/profile/certifications/{cert_id}", headers=headers).status_code == 204
    assert client.get("/api/v1/profile/preferences", headers=headers).status_code == 200
    invalid = {"preferred_job_titles": ["Engineer"], "minimum_expected_salary": 200, "maximum_expected_salary": 100}
    assert client.put("/api/v1/profile/preferences", headers=headers, json=invalid).status_code == 422
    valid = {"preferred_job_titles": ["Engineer", "Engineer"], "preferred_locations": ["Remote"], "preferred_employment_types": ["full-time"], "preferred_work_modes": ["remote"], "minimum_expected_salary": 100, "maximum_expected_salary": 200}
    saved = client.put("/api/v1/profile/preferences", headers=headers, json=valid)
    assert saved.status_code == 200
    assert saved.json()["data"]["preferred_job_titles"] == ["Engineer"]
    assert client.get("/api/v1/profile/preferences", headers=headers).json()["data"]["preferred_locations"] == ["Remote"]
