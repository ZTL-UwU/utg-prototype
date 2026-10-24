from datetime import datetime

from ninja import Schema


class AuditingOut(Schema):
    created_at: datetime
    updated_at: datetime
    created_by: int | None
    updated_by: int | None
    is_active: bool
    is_published: bool

    @staticmethod
    def resolve_created_by(obj):
        return obj.created_by_id

    @staticmethod
    def resolve_updated_by(obj):
        return obj.updated_by_id
