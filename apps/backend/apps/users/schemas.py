from ninja import Field, Schema


class RegisterIn(Schema):
    email: str
    password: str
    name: str | None = None


class LoginIn(Schema):
    email: str
    password: str


class LoginTokenPairOut(Schema):
    access: str
    refresh: str


class RefreshTokenIn(Schema):
    refresh: str


class RefreshedAccessTokenOut(Schema):
    access: str


class UserOut(Schema):
    id: int
    name: str | None
    email: str
    total_score: int
    total_stars: int


class RewardOut(Schema):
    id: int
    name: str
    asset_path: str


class LevelResultIn(Schema):
    level: int
    star: int = Field(ge=0, le=3)
    score: int = Field(ge=0)
    correct: int = Field(ge=0)
    mistake: int = Field(ge=0)


class LevelResultOut(Schema):
    id: int
    level: int
    star: int
    score: int
    correct: int
    mistake: int

    @staticmethod
    def resolve_level(obj):
        return obj.level_id


class ErrorOut(Schema):
    detail: str
