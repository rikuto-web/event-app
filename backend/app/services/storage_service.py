import mimetypes
import uuid
from pathlib import Path

from app.core.config import get_settings
from app.core.exceptions import AppError

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def validate_image(self, *, content_type: str | None, size: int) -> None:
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise AppError(
                code="VALIDATION_ERROR",
                message="JPEG / PNG / WebP のみアップロードできます",
                status_code=422,
            )
        if size > MAX_IMAGE_BYTES:
            raise AppError(
                code="VALIDATION_ERROR",
                message="画像サイズは 5 MB 以下にしてください",
                status_code=422,
            )

    def _extension_for(self, content_type: str) -> str:
        ext = mimetypes.guess_extension(content_type) or ".bin"
        if content_type == "image/webp":
            return ".webp"
        return ext

    def build_object_key(self, event_id: uuid.UUID, content_type: str) -> str:
        return f"events/{event_id}/{uuid.uuid4()}{self._extension_for(content_type)}"

    def build_public_url(self, object_key: str) -> str:
        base = self.settings.storage_public_url_base.rstrip("/")
        return f"{base}/{object_key}"

    def upload_image(self, *, event_id: uuid.UUID, content_type: str, data: bytes) -> str:
        self.validate_image(content_type=content_type, size=len(data))
        object_key = self.build_object_key(event_id, content_type)

        if self.settings.storage_backend == "s3":
            return self._upload_s3(object_key, content_type, data)

        return self._upload_filesystem(object_key, data)

    def delete_object(self, object_key: str) -> None:
        if not object_key:
            return
        if self.settings.storage_backend == "s3":
            self._delete_s3(object_key)
            return
        self._delete_filesystem(object_key)

    def _upload_filesystem(self, object_key: str, data: bytes) -> str:
        root = Path(self.settings.storage_local_path)
        target = root / object_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return object_key

    def _delete_filesystem(self, object_key: str) -> None:
        target = Path(self.settings.storage_local_path) / object_key
        if target.exists():
            target.unlink()

    def _upload_s3(self, object_key: str, content_type: str, data: bytes) -> str:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.s3_access_key,
            aws_secret_access_key=self.settings.s3_secret_key,
        )
        client.put_object(
            Bucket=self.settings.s3_bucket,
            Key=object_key,
            Body=data,
            ContentType=content_type,
        )
        return object_key

    def _delete_s3(self, object_key: str) -> None:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.s3_access_key,
            aws_secret_access_key=self.settings.s3_secret_key,
        )
        client.delete_object(Bucket=self.settings.s3_bucket, Key=object_key)
