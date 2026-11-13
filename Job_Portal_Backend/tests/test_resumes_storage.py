import io
import uuid
import pytest
from tests.test_phase18_validation import create_user

VALID_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
    b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n"
)

def test_resume_upload_and_local_storage_fallback(client):
    headers = create_user(client, "resumetest@jobsterritory.com", "Resume Tester")
    
    # 1. Upload resume
    files = {
        "resume": ("sample_resume.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")
    }
    res = client.post("/api/v1/resumes/upload", headers=headers, files=files)
    assert res.status_code == 202, res.text
    data = res.json()
    assert "resume_id" in data
    assert data["filename"] == "sample_resume.pdf"
    assert data["status"] in ("processing", "uploaded")
    resume_id = data["resume_id"]

    # 2. List resumes
    list_res = client.get("/api/v1/resumes", headers=headers)
    assert list_res.status_code == 200
    resumes = list_res.json()["data"]
    assert any(r["resume_id"] == resume_id for r in resumes)

    # 3. Get analysis & preview URL
    analysis_res = client.get(f"/api/v1/resumes/{resume_id}/analysis", headers=headers)
    assert analysis_res.status_code == 200
    analysis_data = analysis_res.json()
    preview_url = analysis_data["preview_url"]
    assert "/api/v1/resumes/raw/" in preview_url

    # 4. Fetch raw file via endpoint
    raw_path = preview_url.split("/api/v1/resumes/raw/")[-1]
    raw_res = client.get(f"/api/v1/resumes/raw/{raw_path}")
    assert raw_res.status_code == 200
    assert raw_res.headers["content-type"] == "application/pdf"
    assert raw_res.content == VALID_PDF_BYTES

    # 5. Delete resume
    del_res = client.delete(f"/api/v1/resumes/{resume_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify raw file is deleted
    raw_check = client.get(f"/api/v1/resumes/raw/{raw_path}")
    assert raw_check.status_code == 404


def test_job_application_with_resume_file(client, db_factory):
    from tests.test_phase18_validation import seed_job
    job_id = seed_job(db_factory, "Lead Architect")
    headers = create_user(client, "app_resume_user@jobsterritory.com", "App Resume User")

    # Apply with resume and cover letter
    files = {
        "resume": ("candidate_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")
    }
    data = {
        "cover_letter": "I am excited to apply for Lead Architect role at Jobs Territory."
    }
    res = client.post(f"/api/v1/jobs/{job_id}/applications", headers=headers, data=data, files=files)
    assert res.status_code == 201, res.text
    app_data = res.json()
    assert app_data["job_id"] == job_id
    assert app_data["status"] == "applied"
    app_id = app_data["id"]

    # Retrieve application resume download link
    link_res = client.get(f"/api/v1/applications/{app_id}/resume", headers=headers)
    assert link_res.status_code == 200
    resume_url = link_res.json()["url"]
    assert "/api/v1/resumes/raw/" in resume_url

    # Check that downloading the resume from the url works
    raw_path = resume_url.split("/api/v1/resumes/raw/")[-1]
    download_res = client.get(f"/api/v1/resumes/raw/{raw_path}")
    assert download_res.status_code == 200
    assert download_res.content == VALID_PDF_BYTES
