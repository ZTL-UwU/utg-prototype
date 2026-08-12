from pathlib import Path

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
    total_score: int
    total_stars: int
    reward_ids: list[int]

    @staticmethod
    def resolve_reward_ids(obj) -> list[int]:
        return list(obj.rewards.order_by("id").values_list("id", flat=True))


class LoginTokenPairOut(Schema):
    access: str
    refresh: str
    user: UserOut


class RefreshTokenIn(Schema):
    refresh: str


class RefreshedAccessTokenOut(Schema):
    access: str


class RewardImageIn(Schema):
    name: str
    is_published: bool = True


class RewardImageOut(AuditingOut):
    id: int
    name: str
    image: ImageOut

    @staticmethod
    def resolve_image(obj) -> ImageOut:
        return _image_out(obj.image)


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


class RewardSimpleOut(Schema):
    id: int
    type: str
    image_url: str

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
    level: int
    star: int
    score: int
    correct: int
    mistake: int

    @staticmethod
    def resolve_level(obj):
        return obj.level_id


class LevelResultCreateOut(LevelResultOut):
    reward_ids: list[int]

    @staticmethod
    def resolve_reward_ids(obj) -> list[int]:
        return list(obj.user.rewards.order_by("id").values_list("id", flat=True))


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
