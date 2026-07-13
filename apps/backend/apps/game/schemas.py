from typing import Any

from ninja import Schema


class MascotOut(Schema):
    id: int
    name: str | None
    idle_asset_path: str
    zero_star_asset_path: str
    one_star_asset_path: str
    two_star_asset_path: str
    three_star_asset_path: str


class LevelTypeOut(Schema):
    id: int
    name: str | None
    props_json_schema: Any


class LevelOut(Schema):
    id: int
    sort_order: int
    layer: str
    title: str | None
    level_type: LevelTypeOut
    level_props: Any
    mascot: MascotOut | None
    splash_background_asset_path: str
    splash_button_color: int | None
    splash_button_text_color: int | None
    splash_level_font_color: int | None
    splash_level_title_color: int | None
    show_mascot_on_splash: bool


class UnitOut(Schema):
    id: int
    sort_order: int
    layer: str
    title: str
    title_font_size: int
    background_asset_path: str
    levels: list[LevelOut]

    @staticmethod
    def resolve_levels(obj):
        return list(obj.levels.all())


class SidebarUnitOut(Schema):
    id: int
    layer: str
    title: str
