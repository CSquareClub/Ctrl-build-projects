import hashlib
import hmac
import os

from fastapi import HTTPException, Request, status


WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")


async def verify_github_signature(request: Request) -> bytes:
    """
    Validate the X-Hub-Signature-256 header sent by GitHub.
    Returns raw body bytes so routers don't have to re-read the stream.
    Raises HTTP 401 if the signature is missing or does not match.
    """
    body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256", "")

    if not signature_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing signature")

    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature_header):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    return body
