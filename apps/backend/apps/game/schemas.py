from pathlib import Path
from typing import Any, Literal

from ninja import Schema

from apps.common.schemas import AuditingOut

LayerValue = Literal["typing", "education", "game"]


class ImageOut(Schema):
    name: str
    url: str
    filename: str


def _image_out(image) -> ImageOut:
    return ImageOut(
        name=image.name,
        url=image.url,
        filename=Path(image.name).name,
    )


def _optional_image_out(image) -> ImageOut | None:
    if not image:
        return None
    return _image_out(image)


class MascotIn(Schema):
    name: str | None = None


class MascotOut(AuditingOut):
    id: int
    name: str | None
    idle_image: ImageOut
    sad_image: ImageOut
    zero_star_image: ImageOut
    one_star_image: ImageOut
    two_star_image: ImageOut
    three_star_image: ImageOut

    @staticmethod
    def resolve_idle_image(obj) -> ImageOut:
        return _image_out(obj.idle_image)

    @staticmethod
    def resolve_sad_image(obj) -> ImageOut:
        return _image_out(obj.sad_image)

    @staticmethod
    def resolve_zero_star_image(obj) -> ImageOut:
        return _image_out(obj.zero_star_image)

    @staticmethod
    def resolve_one_star_image(obj) -> ImageOut:
        return _image_out(obj.one_star_image)

    @staticmethod
    def resolve_two_star_image(obj) -> ImageOut:
        return _image_out(obj.two_star_image)

    @staticmethod
    def resolve_three_star_image(obj) -> ImageOut:
        return _image_out(obj.three_star_image)


class LevelOut(AuditingOut):
    id: int
    sort_order: int
    layer: str
    title: str | None
    level_type: str
    level_props: Any
    mascot: MascotOut | None
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
    splash_button_color: int | None = None
    splash_button_text_color: int | None = None
    splash_level_font_color: int | None = None
    splash_level_title_color: int | None = None
    show_mascot_on_splash: bool
    backdrop_color: int
    is_published: bool


class WordIn(Schema):
    word: str
    target_letter: str | None = None
    translation: str | None = None
    is_tutorial_word: bool = False
    clear_image: bool = False
    clear_audio: bool = False


class AudioOut(Schema):
    name: str
    url: str
    filename: str


class WordOut(Schema):
    id: int
    word: str
    target_letter: str | None
    translation: str | None
    is_tutorial_word: bool
    image: ImageOut | None = None
    audio: AudioOut | None = None

    @staticmethod
    def resolve_image(obj) -> ImageOut | None:
        return _optional_image_out(obj.image)

    @staticmethod
    def resolve_audio(obj) -> AudioOut | None:
        audio = obj.audio
        if not audio:
            return None
        return AudioOut(
            name=audio.name,
            url=audio.url,
            filename=Path(audio.name).name,
        )


class WordSimpleOut(Schema):
    id: int
    word: str
    target_letter: str | None
    is_tutorial_word: bool
    image_url: str | None = None
    audio_url: str | None = None

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        return obj.image.url if obj.image else None

    @staticmethod
    def resolve_audio_url(obj) -> str | None:
        return obj.audio.url if obj.audio else None


class SentenceIn(Schema):
    sentence: str
    translation: str | None = None
    story_id: int | None = None
    clear_audio: bool = False


class SentenceOut(Schema):
    id: int
    sentence: str
    translation: str | None
    story_id: int | None = None
    sort_order: int | None = None
    audio: AudioOut | None = None

    @staticmethod
    def resolve_story_id(obj) -> int | None:
        return obj.story_id

    @staticmethod
    def resolve_audio(obj) -> AudioOut | None:
        audio = obj.audio
        if not audio:
            return None
        return AudioOut(
            name=audio.name,
            url=audio.url,
            filename=Path(audio.name).name,
        )


class SentenceSimpleOut(Schema):
    id: int
    sentence: str
    story_id: int | None = None
    sort_order: int | None = None
    audio_url: str | None = None

    @staticmethod
    def resolve_story_id(obj) -> int | None:
        return obj.story_id

    @staticmethod
    def resolve_audio_url(obj) -> str | None:
        return obj.audio.url if obj.audio else None


class StoryIn(Schema):
    name: str
    is_published: bool = True


class StoryOut(Schema):
    id: int
    name: str
    is_published: bool
    sentences: list[SentenceOut]

    @staticmethod
    def resolve_sentences(obj) -> list:
        return list(obj.sentences.all())


class StorySimpleOut(Schema):
    id: int
    name: str
    sentence_ids: list[int]

    @staticmethod
    def resolve_sentence_ids(obj) -> list[int]:
        return [sentence.id for sentence in obj.sentences.all()]


class LevelOrderIn(Schema):
    level_ids: list[int]


class UnitOrderIn(Schema):
    unit_ids: list[int]


class SentenceOrderIn(Schema):
    story_id: int | None = None
    sentence_ids: list[int]


class ErrorOut(Schema):
    detail: str
