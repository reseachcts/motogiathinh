"""MinIO/S3 file storage service."""

import uuid
from pathlib import PurePosixPath

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.config import settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name="us-east-1",
    )


def _ensure_bucket(client):
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
    except ClientError:
        client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
        # Make bucket public-read for serving images
        policy = (
            '{"Version":"2012-10-17","Statement":[{"Effect":"Allow",'
            '"Principal":"*","Action":"s3:GetObject",'
            f'"Resource":"arn:aws:s3:::{settings.S3_BUCKET_NAME}/*"'
            "}]}"
        )
        client.put_bucket_policy(Bucket=settings.S3_BUCKET_NAME, Policy=policy)


async def upload_file(file: UploadFile, folder: str) -> str:
    """Upload file to MinIO and return the public URL."""
    if file.content_type not in ALLOWED_TYPES:
        raise ValueError(f"File type {file.content_type} not allowed. Use JPG, PNG, or WebP.")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise ValueError(f"File too large ({len(content) // 1024}KB). Max {MAX_SIZE // 1024 // 1024}MB.")

    ext = PurePosixPath(file.filename or "image.jpg").suffix or ".jpg"
    key = f"{folder}/{uuid.uuid4().hex}{ext}"

    client = _get_client()
    _ensure_bucket(client)

    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=file.content_type,
    )

    return f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET_NAME}/{key}"


def upload_bytes(key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
    """Sync upload of raw bytes to MinIO; returns the public URL.

    Used by /api/students/{id}/docs/{key} and /api/payments/{id}/bien-lai
    where the caller has already read the request body (and validated
    size/type via magic-bytes elsewhere).
    """
    client = _get_client()
    _ensure_bucket(client)
    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    return f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET_NAME}/{key}"


def get_object_bytes(key: str) -> tuple[bytes, str]:
    """Fetch raw bytes + content_type for /api/files/<kind>/<recId>/<filename>."""
    client = _get_client()
    obj = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    return obj["Body"].read(), obj.get("ContentType", "application/octet-stream")


async def delete_file(url: str) -> None:
    """Delete file from MinIO by its URL."""
    prefix = f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET_NAME}/"
    if not url.startswith(prefix):
        return
    key = url[len(prefix):]
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    except ClientError:
        pass
