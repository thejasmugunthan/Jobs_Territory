from fastapi import Request
from fastapi.responses import JSONResponse


class ProfileError(Exception):
    def __init__(self, status_code: int, message: str, error_code: str):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code


async def profile_error_handler(_: Request, exc: ProfileError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.message, "error_code": exc.error_code})
