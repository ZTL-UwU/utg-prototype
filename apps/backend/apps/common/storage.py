import uuid
from pathlib import Path

from django.core.files.storage import Storage, storages
from django.utils.deconstruct import deconstructible


def public_storage() -> Storage:
    """Storage for game media served from a public, CDN-cached domain."""
    return storages["public"]


@deconstructible
class UniqueUploadTo:
    """
    Store each upload under a fresh key inside `prefix`.

    Public media is cached as immutable, so a key must never be reused for different content.
    Replacing a file used to delete the old object and save the new one under the same name,
    which would leave browsers and the CDN serving the old file.
    """

    def __init__(self, prefix: str):
        self.prefix = prefix

    def __call__(self, _instance, filename: str) -> str:
        path = Path(filename)
        return f"{self.prefix}{path.stem}-{uuid.uuid4().hex[:8]}{path.suffix.lower()}"

    def __eq__(self, other: object) -> bool:
        return isinstance(other, UniqueUploadTo) and self.prefix == other.prefix
