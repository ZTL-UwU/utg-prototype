from typing import Any, Literal

from ninja import Schema

from apps.common.schemas import AuditingOut

LayerValue = Literal["typing", "education", "game"]


class MascotOut(AuditingOut):
    id: int
    name: str | None
    idle_asset_path: str
    zero_star_asset_path: str
    one_star_asset_path: str
    two_star_asset_path: str
    three_star_asset_path: str


class LevelOut(AuditingOut):
    id: int
    sort_order: int
    layer: str
    title: str | None
    level_type: str
    level_props: Any
    mascot: MascotOut | None
    splash_background_asset_path: str
    splash_button_color: int | None
    splash_button_text_color: int | None
    splash_level_font_color: int | None
    splash_level_title_color: int | None
    show_mascot_on_splash: bool
    backdrop_color: int


class LevelShortOut(AuditingOut):
    id: int
    sort_order: int
    title: str | None


class UnitOut(AuditingOut):
    id: int
    sort_order: int
    layer: str
    title: str
    title_font_size: int
    title_font_color: int
    title_is_curved: bool
    subtitle_text: str | None
    subtitle_font_size: int | None
    subtitle_font_color: int | None
    background_asset_path: str
    levels: list[LevelOut]

    @staticmethod
    def resolve_levels(obj):
        return list(obj.levels.all())


class UnitByLayerOut(AuditingOut):
    id: int
    sort_order: int
    layer: str
    title: str
    title_font_size: int
    title_font_color: int
    title_is_curved: bool
    subtitle_text: str | None
    subtitle_font_size: int | None
    subtitle_font_color: int | None
    background_asset_path: str
    levels: list[LevelShortOut]

    @staticmethod
    def resolve_levels(obj):
        return list(obj.levels.all())


class UnitByIdOut(AuditingOut):
    id: int
    sort_order: int
    layer: str
    title: str
    title_font_size: int
    title_font_color: int
    title_is_curved: bool
    subtitle_text: str | None
    subtitle_font_size: int | None
    subtitle_font_color: int | None
    background_asset_path: str
    levels: list[LevelOut]

    @staticmethod
    def resolve_levels(obj):
        return list(obj.levels.all())


class SidebarUnitOut(Schema):
    id: int
    layer: str
    title: str


class UnitUpdateIn(Schema):
    layer: LayerValue
    title: str
    title_font_size: int
    title_font_color: int
    title_is_curved: bool
    subtitle_text: str | None = None
    subtitle_font_size: int | None = None
    subtitle_font_color: int | None = None
    background_asset_path: str
    is_published: bool


class LevelWriteIn(Schema):
    title: str | None = None
    level_type: str
    level_props: Any
    mascot_id: int | None = None
    splash_background_asset_path: str
    splash_button_color: int | None = None
    splash_button_text_color: int | None = None
    splash_level_font_color: int | None = None
    splash_level_title_color: int | None = None
    show_mascot_on_splash: bool
    backdrop_color: int
    is_published: bool

class WordIn(Schema):
    word : str
    target_letter : str


class WordOut(Schema):
    id: int
    word: str
    target_letter: str
    image_url: str

    @staticmethod
    def resolve_image_url(obj) -> str:
        return obj.image.url

class LevelOrderIn(Schema):
    level_ids: list[int]


class UnitOrderIn(Schema):
    unit_ids: list[int]


class ErrorOut(Schema):
    detail: str

