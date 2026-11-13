"""Conservative, deterministic PDF resume extraction. Never writes to candidate profile."""

import hashlib
import re

SKILLS = {
    "Python": ["python"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript"],
    "C#": ["c#", "c sharp"],
    "C++": ["c++"],
    "React": ["react", "react.js", "reactjs"],
    "Angular": ["angular"],
    "Vue.js": ["vue", "vue.js"],
    "Next.js": ["next.js", "nextjs"],
    "HTML": ["html"],
    "CSS": ["css"],
    "Tailwind CSS": ["tailwind css"],
    "FastAPI": ["fastapi"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Node.js": ["node.js", "nodejs", "node"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "MongoDB": ["mongodb"],
    "Redis": ["redis"],
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure"],
    "GCP": ["gcp", "google cloud"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Machine Learning": ["machine learning"],
    "Deep Learning": ["deep learning"],
    "NLP": ["natural language processing", "nlp"],
    "TensorFlow": ["tensorflow"],
    "PyTorch": ["pytorch"],
}
DEGREES = [
    "Bachelor of Computer Applications",
    "Master of Computer Applications",
    "Bachelor of Engineering",
    "Bachelor of Technology",
    "Master of Science",
    "Bachelor's degree",
    "Master's degree",
    "PhD",
]


def extract_pdf(content: bytes, max_pages: int, max_characters: int) -> tuple[str, int]:
    import fitz

    try:
        document = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        raise ValueError("malformed_pdf") from exc
    if document.needs_pass:
        raise ValueError("encrypted_pdf")
    if len(document) > max_pages:
        raise ValueError("too_many_pages")
    if not len(document):
        raise ValueError("empty_pdf")
    pages = [page.get_text("text") for page in document]
    text = "\n\n".join(
        re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", page) for page in pages
    )
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) > max_characters:
        text = text[:max_characters]
    return text, len(document)


def analyze_text(text: str) -> dict:
    skills = []
    for canonical, aliases in SKILLS.items():
        for alias in aliases:
            match = re.search(
                r"(?<![\w+#.])" + re.escape(alias) + r"(?![\w+#.])", text, re.IGNORECASE
            )
            if match:
                start, end = max(0, match.start() - 60), min(
                    len(text), match.end() + 60
                )
                skills.append(
                    {
                        "name": canonical,
                        "category": "technical",
                        "confidence": 0.88,
                        "evidence": text[start:end].strip(),
                    }
                )
                break
    education = []
    for degree in DEGREES:
        if re.search(re.escape(degree), text, re.IGNORECASE):
            education.append(
                {
                    "degree": degree,
                    "institution": None,
                    "field_of_study": None,
                    "graduation_year": None,
                    "confidence": 0.65,
                    "evidence": degree,
                }
            )
    # Only return employment rows when a clear date range and title-like line are present.
    experience = []
    date_rx = re.compile(
        r"\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current)\b",
        re.IGNORECASE,
    )
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for i, line in enumerate(lines):
        if date_rx.search(line) and i > 0:
            experience.append(
                {
                    "job_title": lines[i - 1][:160],
                    "company": None,
                    "date_range": date_rx.search(line).group(0),
                    "responsibilities": [],
                    "confidence": 0.45,
                    "evidence": line,
                }
            )
    projects, certifications = [], []
    for header, target, key in (
        ("projects", projects, "title"),
        ("certifications", certifications, "name"),
        ("certificates", certifications, "name"),
    ):
        try:
            start = next(
                i
                for i, line in enumerate(lines)
                if re.fullmatch(header, line.rstrip(":"), re.IGNORECASE)
            )
            for line in lines[start + 1 :]:
                if len(line) < 120 and not re.fullmatch(
                    r"(education|experience|skills|employment|work history)",
                    line.rstrip(":"),
                    re.IGNORECASE,
                ):
                    if re.fullmatch(r"[A-Z][A-Za-z0-9 &+:#./-]{2,70}", line):
                        target.append(
                            {
                                key: line,
                                "description": None,
                                "technologies": [],
                                "confidence": 0.4,
                                "evidence": line,
                            }
                        )
                else:
                    break
        except StopIteration:
            pass
    if not certifications:
        # avoid overclaiming; without a certificate section no credentials are inferred
        certifications = []
    return {
        "skills": skills,
        "education": education,
        "experience": experience,
        "projects": projects,
        "certifications": certifications,
    }


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
