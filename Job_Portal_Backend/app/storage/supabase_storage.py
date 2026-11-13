from datetime import UTC, datetime, timedelta
from urllib.parse import quote

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings


class SupabaseStorage:
    """Small synchronous adapter for Supabase's private Storage REST API."""

    def __init__(self, settings: Settings):
        self.base_url = settings.supabase_url.rstrip("/")
        self.bucket = settings.resume_bucket
        self.ttl = settings.resume_signed_url_ttl_seconds
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }

    def _require_configuration(self) -> None:
        if not self.base_url.startswith("https://") or len(self.headers["apikey"]) < 32:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, "Resume storage is not configured"
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
        self._require_configuration()
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
        except httpx.HTTPError:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Could not securely store the resume",
            ) from None

    def delete(self, path: str) -> None:
        self._require_configuration()
        try:
            response = httpx.delete(
                f"{self.base_url}/storage/v1/object/{quote(self.bucket)}/{quote(path, safe='/')}",
                headers=self.headers,
                timeout=10,
            )
            if response.status_code not in (200, 204, 404):
                response.raise_for_status()
        except httpx.HTTPError:
            # Cleanup is best effort. Never mask the database error that triggered it.
            return

    def download(self, path: str) -> bytes:
        self._require_configuration()
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

    def signed_url(self, path: str) -> tuple[str, datetime]:
        self._require_configuration()
        self._require_private_bucket()
        expires_at = datetime.now(UTC) + timedelta(seconds=self.ttl)
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
