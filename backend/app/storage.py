import boto3
from botocore.exceptions import ClientError

from app.config import settings


class S3StorageClient:
    """Thin wrapper over an S3-compatible object store. Same interface works
    against a real S3-compatible endpoint (MinIO, AWS S3) or moto's in-memory
    mock in tests — nothing about the wrapper itself is a stub."""

    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key_id or None,
            aws_secret_access_key=settings.s3_secret_access_key or None,
            region_name=settings.s3_region,
        )
        self._bucket = settings.s3_bucket

    def ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self._bucket)

    def put(self, key: str, content: bytes) -> None:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=content)

    def get(self, key: str) -> bytes:
        response = self._client.get_object(Bucket=self._bucket, Key=key)
        return response["Body"].read()


storage_client = S3StorageClient()
