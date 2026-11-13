import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings


class SupabaseStorage:
    """Synchronous adapter for Supabase private Storage with transparent local filesystem fallback."""

    def __init__(self, settings: Settings):
        self.base_url = settings.supabase_url.rstrip("/") if settings.supabase_url else ""
        self.bucket = settings.resume_bucket
        self.ttl = settings.resume_signed_url_ttl_seconds
        self.service_key = settings.supabase_service_role_key or ""
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
        }
        self.backend_url = settings.backend_url.rstrip("/") if settings.backend_url else "http://localhost:8000"
        self.local_dir = Path("uploads")
        self.local_dir.mkdir(parents=True, exist_ok=True)

    @property
    def is_supabase_configured(self) -> bool:
        return bool(
            self.base_url.startswith("https://")
            and len(self.service_key) >= 32
        )

    def _require_private_bucket(self) -> None:
        try:
            response = httpx.get(
                f"{self.base_url}/storage/v1/bucket/{quote(self.bucket)}",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            if response.json().get("public") is not False:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Resume storage bucket must be private",
                )
        except httpx.HTTPError:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Private resume storage is unavailable",
            ) from None

    def upload(self, path: str, content: bytes) -> None:
        if self.is_supabase_configured:
            self._require_private_bucket()
            encoded_path = quote(path, safe="/")
            try:
                response = httpx.post(
                    f"{self.base_url}/storage/v1/object/{quote(self.bucket)}/{encoded_path}",
                    headers={
                        **self.headers,
                        "Content-Type": "application/pdf",
                        "x-upsert": "false",
                    },
                    content=content,
                    timeout=20,
                )
                response.raise_for_status()
                return
            except httpx.HTTPError:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Could not securely store the resume",
                ) from None

        # Local storage fallback
        dest = (self.local_dir / path).resolve()
        if not str(dest).startswith(str(self.local_dir.resolve())):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid storage path")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)

    def delete(self, path: str) -> None:
        if self.is_supabase_configured:
            try:
                response = httpx.delete(
                    f"{self.base_url}/storage/v1/object/{quote(self.bucket)}/{quote(path, safe='/')}",
                    headers=self.headers,
                    timeout=10,
                )
                if response.status_code not in (200, 204, 404):
                    response.raise_for_status()
            except httpx.HTTPError:
                return
            return

        # Local storage fallback
        dest = (self.local_dir / path).resolve()
        if str(dest).startswith(str(self.local_dir.resolve())) and dest.is_file():
            try:
                dest.unlink(missing_ok=True)
            except OSError:
                pass

    def download(self, path: str) -> bytes:
        if self.is_supabase_configured:
            self._require_private_bucket()
            try:
                response = httpx.get(
                    f"{self.base_url}/storage/v1/object/{quote(self.bucket)}/{quote(path, safe='/')}",
                    headers=self.headers,
                    timeout=30,
                )
                response.raise_for_status()
                return response.content
            except httpx.HTTPError:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Resume processing is temporarily unavailable",
                ) from None

        # Local storage fallback
        dest = (self.local_dir / path).resolve()
        if not str(dest).startswith(str(self.local_dir.resolve())) or not dest.is_file():
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Resume file was not found",
            )
        return dest.read_bytes()

    def signed_url(self, path: str) -> tuple[str, datetime]:
        expires_at = datetime.now(UTC) + timedelta(seconds=self.ttl)
        if self.is_supabase_configured:
            self._require_private_bucket()
            try:
                response = httpx.post(
                    f"{self.base_url}/storage/v1/object/sign/{quote(self.bucket)}/{quote(path, safe='/')}",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json={"expiresIn": self.ttl, "download": True},
                    timeout=10,
                )
                response.raise_for_status()
                signed_path = response.json().get("signedURL")
                if not isinstance(signed_path, str):
                    raise TypeError("Missing signed URL")
                if signed_path.startswith("https://"):
                    return signed_path, expires_at
                return (
                    f"{self.base_url}/storage/v1{signed_path if signed_path.startswith('/') else '/' + signed_path}",
                    expires_at,
                )
            except (httpx.HTTPError, TypeError):
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Resume download is temporarily unavailable",
                ) from None

        # Local storage fallback: direct preview link
        encoded_path = quote(path, safe="/")
        return f"{self.backend_url}/api/v1/resumes/raw/{encoded_path}", expires_at
