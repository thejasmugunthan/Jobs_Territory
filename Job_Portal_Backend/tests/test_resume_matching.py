from app.matching.routes import calculate_overall_score, norm
from app.resumes.analyzer import analyze_text


def make_pdf(*page_text: str, encryption: bool = False) -> bytes:
    import fitz

    doc = fitz.open()
    for text in page_text:
        page = doc.new_page()
        if text:
            page.insert_text((72, 72), text)
    options = (
        {
            "encryption": fitz.PDF_ENCRYPT_AES_256,
            "owner_pw": "owner",
            "user_pw": "secret",
        }
        if encryption
        else {}
    )
    return doc.tobytes(**options)


def test_skill_extraction_normalizes_aliases_and_deduplicates():
    result = analyze_text(
        "Built a React.js UI and React application using PostgreSQL Database."
    )
    names = [skill["name"] for skill in result["skills"]]
    assert names == ["React", "PostgreSQL"]
    assert all(item["evidence"] for item in result["skills"])


def test_skill_extraction_avoids_substring_false_positives():
    names = [
        skill["name"]
        for skill in analyze_text("Experienced JavaScript developer")["skills"]
    ]
    assert "Java" not in names
    assert "JavaScript" in names


def test_skill_matching_aliases_are_explicit():
    assert norm("React.js") == "react"
    assert norm("Postgres") == "postgresql"
    assert norm("Node") == "node.js"
    assert norm("React Native") == "react native"


def test_compatibility_score_renormalizes_available_weights():
    assert calculate_overall_score(80, 100, None) == (86, 85)
    assert calculate_overall_score(None, None, None) == (None, 0)
    assert calculate_overall_score(150, None, None) == (100, 60)
    assert calculate_overall_score(80, 100, None, relevant=(True, True, False)) == (
        86,
        100,
    )


def test_pdf_extraction_preserves_multiple_pages():
    from app.resumes.analyzer import extract_pdf

    text, pages = extract_pdf(
        make_pdf("Python developer", "PostgreSQL developer"), 3, 1000
    )
    assert pages == 2
    assert "Python developer" in text and "PostgreSQL developer" in text


def test_pdf_extraction_rejects_malformed_encrypted_and_oversized_documents():
    import pytest

    from app.resumes.analyzer import extract_pdf

    with pytest.raises(ValueError, match="malformed_pdf"):
        extract_pdf(b"not a pdf", 3, 1000)
    with pytest.raises(ValueError, match="encrypted_pdf"):
        extract_pdf(make_pdf("secret", encryption=True), 3, 1000)
    with pytest.raises(ValueError, match="too_many_pages"):
        extract_pdf(make_pdf("one", "two"), 1, 1000)


def test_textless_pdf_is_detectable_by_pipeline_threshold():
    from app.resumes.analyzer import extract_pdf

    text, pages = extract_pdf(make_pdf(""), 3, 1000)
    assert pages == 1
    assert text == ""


def test_new_candidate_routes_require_authentication(client):
    assert client.get("/api/v1/resumes").status_code == 401
    assert (
        client.get(
            "/api/v1/jobs/00000000-0000-0000-0000-000000000001/match"
        ).status_code
        == 401
    )
