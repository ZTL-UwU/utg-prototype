from datetime import datetime
from pathlib import Path
from typing import Literal

from ninja import Field, Schema

from apps.common.schemas import AuditingOut
from apps.game.schemas import ImageOut, LayerValue


def _image_out(image) -> ImageOut:
    return ImageOut(
        name=image.name,
        url=image.url,
        filename=Path(image.name).name,
    )


class RegisterIn(Schema):
    email: str
    password: str
    name: str | None = None


class LoginIn(Schema):
    email: str
    password: str


class UserOut(Schema):
    id: int
    name: str | None
    email: str
    is_cheat: bool


class AdminUserOut(Schema):
    id: int
    name: str | None
    email: str
    is_staff: bool
    is_active: bool
    is_cheat: bool
    date_joined: datetime


class AdminUserPatchIn(Schema):
    is_cheat: bool


class LoginTokenPairOut(Schema):
    access: str
    refresh: str
    user: UserOut


class RefreshTokenIn(Schema):
    refresh: str


class RefreshedAccessTokenOut(Schema):
    access: str


class RewardImageOut(AuditingOut):
    id: int
    name: str
    image: ImageOut
    reward_count: int

    @staticmethod
    def resolve_image(obj) -> ImageOut:
        return _image_out(obj.image)

    @staticmethod
    def resolve_reward_count(obj) -> int:
        count = getattr(obj, "reward_count", None)
        if count is not None:
            return count
        return obj.rewards.count()


class RewardIn(Schema):
    type: str
    layer: LayerValue
    level: int | None = None
    image_id: int
    is_published: bool = True


class RewardOut(AuditingOut):
    id: int
    type: str
    layer: str
    level: int | None
    image_id: int
    image: ImageOut

    @staticmethod
    def resolve_level(obj) -> int | None:
        return obj.level_id

    @staticmethod
    def resolve_image_id(obj) -> int:
        return obj.image_id

    @staticmethod
    def resolve_image(obj) -> ImageOut:
        return _image_out(obj.image.image)


RewardBulkMode = Literal["fill_missing", "overwrite"]


class RewardBulkIn(Schema):
    items: list[RewardIn]
    mode: RewardBulkMode = "fill_missing"


class RewardBulkOut(Schema):
    created: int
    updated: int
    skipped: int
    rewards: list[RewardOut]


class RewardSimpleOut(Schema):
    id: int
    type: str
    layer: str
    level: int | None
    image_url: str

    @staticmethod
    def resolve_level(obj) -> int | None:
        return obj.level_id

    @staticmethod
    def resolve_image_url(obj) -> str:
        return obj.image.image.url


class LevelResultIn(Schema):
    level: int
    star: int = Field(ge=0, le=3)
    score: int = Field(ge=0)
    correct: int = Field(ge=0)
    mistake: int = Field(ge=0)


class LevelResultOut(AuditingOut):
    id: int
    level_id: int
    star: int
    score: int
    correct: int
    mistake: int

    @staticmethod
    def resolve_level_id(obj):
        return obj.level_id


class LevelResultCreateOut(Schema):
    results: list[LevelResultOut]
    reward_ids: list[int]
    new_reward_ids: list[int]


class ErrorOut(Schema):
    detail: str


class DetailOut(Schema):
    detail: str


class PasswordResetRequestIn(Schema):
    email: str


class PasswordResetConfirmIn(Schema):
    uid: str
    token: str
    password: str
