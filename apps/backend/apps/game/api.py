from django.db import transaction
from django.db.models import Max, Prefetch
from django.utils import timezone
from ninja import File, Form, Router, Status, UploadedFile

from apps.common.auth import jwt_auth
from apps.common.permissions import require_perm
from apps.game.models import Layer, Level, LevelType, Mascot, Sentence, Story, Unit, Word
from apps.game.schemas import (
    ErrorOut,
    LevelOrderIn,
    LevelOut,
    LevelWriteIn,
    MascotOut,
    SentenceIn,
    SentenceOut,
    SentenceSimpleOut,
    SidebarUnitOut,
    StoryIn,
    StoryOut,
    StorySimpleOut,
    UnitByIdOut,
    UnitByLayerOut,
    UnitOrderIn,
    UnitOut,
    UnitUpdateIn,
    WordIn,
    WordOut,
    WordSimpleOut,
)

router = Router(tags=["game"])


def _unit_with_levels(unit_id: int) -> Unit:
    levels = Level.objects.select_related("mascot").order_by("sort_order", "id")
    return Unit.objects.prefetch_related(Prefetch("levels", queryset=levels)).get(id=unit_id)


def _apply_unit_payload(unit: Unit, payload: UnitUpdateIn) -> None:
    unit.layer = payload.layer
    unit.title = payload.title
    unit.title_font_size = payload.title_font_size
    unit.title_font_color = payload.title_font_color
    unit.title_is_curved = payload.title_is_curved
    unit.subtitle_text = payload.subtitle_text
    unit.subtitle_font_size = payload.subtitle_font_size
    unit.subtitle_font_color = payload.subtitle_font_color
    unit.background_asset_path = payload.background_asset_path
    unit.is_published = payload.is_published


def _apply_level_payload(level: Level, payload: LevelWriteIn) -> None:
    level.title = payload.title
    level.level_type = payload.level_type
    level.level_props = payload.level_props
    level.mascot_id = payload.mascot_id
    level.splash_background_asset_path = payload.splash_background_asset_path
    level.splash_button_color = payload.splash_button_color
    level.splash_button_text_color = payload.splash_button_text_color
    level.splash_level_font_color = payload.splash_level_font_color
    level.splash_level_title_color = payload.splash_level_title_color
    level.show_mascot_on_splash = payload.show_mascot_on_splash
    level.backdrop_color = payload.backdrop_color
    level.is_published = payload.is_published


def _validate_level_relations(payload: LevelWriteIn):
    if payload.level_type not in LevelType.values:
        return Status(400, {"detail": "Unknown level type."})
    if payload.mascot_id is not None and not Mascot.objects.filter(id=payload.mascot_id).exists():
        return Status(404, {"detail": "Mascot not found."})
    return None


@router.get(
    "/units/list",
    response=list[UnitOut],
    summary="[Public] List published units and their published levels",
)
def list_units(request):
    levels = (
        Level.objects.filter(is_published=True, is_active=True)
        .select_related("mascot")
        .order_by("sort_order", "id")
    )
    return (
        Unit.objects.filter(is_published=True, is_active=True)
        .prefetch_related(Prefetch("levels", queryset=levels))
        .order_by("sort_order", "id")
    )


@router.get(
    "/units/sidebar",
    auth=jwt_auth,
    response={200: list[SidebarUnitOut], 403: ErrorOut},
    summary="[Admin] List units for admin sidebar navigation",
)
@require_perm("game.view_unit", message="You do not have permission to view units")
def list_sidebar_units(request):
    return Unit.objects.only("id", "layer", "title", "sort_order").order_by("sort_order", "id")


@router.get(
    "/mascots/list",
    auth=jwt_auth,
    response={200: list[MascotOut], 403: ErrorOut},
    summary="[Admin] List mascots for admin editing",
)
@require_perm("game.view_mascot", message="You do not have permission to view mascots")
def list_mascots(request):
    return Mascot.objects.order_by("name", "id")


@router.get(
    "/units/list-by-layer/{layer}",
    auth=jwt_auth,
    response={200: list[UnitByLayerOut], 403: ErrorOut},
    summary="[Admin] List units by layer",
)
@require_perm("game.view_unit", message="You do not have permission to view units")
def list_units_by_layer(request, layer: Layer):
    levels = Level.objects.order_by("sort_order", "id")
    return (
        Unit.objects.filter(layer=layer)
        .prefetch_related(Prefetch("levels", queryset=levels))
        .order_by("sort_order", "id")
    )


@router.post(
    "/units",
    auth=jwt_auth,
    response={200: UnitByIdOut, 400: ErrorOut, 403: ErrorOut},
    summary="[Admin] Create a unit",
)
@require_perm("game.add_unit", message="You do not have permission to create units")
def create_unit(request, payload: UnitUpdateIn):
    next_sort_order = (
        Unit.objects.filter(layer=payload.layer).aggregate(max_sort_order=Max("sort_order"))[
            "max_sort_order"
        ]
        or 0
    ) + 1
    unit = Unit(sort_order=next_sort_order)
    _apply_unit_payload(unit, payload)
    unit.created_by = request.auth
    unit.updated_by = request.auth
    unit.save()
    return _unit_with_levels(unit.id)


@router.get(
    "/units/{unit_id}",
    auth=jwt_auth,
    response={200: UnitByIdOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Get a unit by ID",
)
@require_perm("game.view_unit", message="You do not have permission to view units")
def get_unit(request, unit_id: int):
    return _unit_with_levels(unit_id)


@router.patch(
    "/units/{unit_id}",
    auth=jwt_auth,
    response={200: UnitByIdOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a unit",
)
@require_perm("game.change_unit", message="You do not have permission to edit units")
def update_unit(request, unit_id: int, payload: UnitUpdateIn):
    try:
        unit = _unit_with_levels(unit_id)
    except Unit.DoesNotExist:
        return Status(404, {"detail": "Unit not found."})

    _apply_unit_payload(unit, payload)
    unit.updated_by = request.auth
    unit.save()
    return unit


@router.delete(
    "/units/{unit_id}",
    auth=jwt_auth,
    response={204: None, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a unit",
)
@require_perm("game.delete_unit", message="You do not have permission to delete units")
def delete_unit(request, unit_id: int):
    deleted, _ = Unit.objects.filter(id=unit_id).delete()
    if not deleted:
        return Status(404, {"detail": "Unit not found."})
    return Status(204, None)


@router.post(
    "/units/{unit_id}/levels",
    auth=jwt_auth,
    response={200: LevelOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Create a level in a unit",
)
@require_perm("game.add_level", message="You do not have permission to create levels")
def create_level(request, unit_id: int, payload: LevelWriteIn):
    try:
        unit = Unit.objects.get(id=unit_id)
    except Unit.DoesNotExist:
        return Status(404, {"detail": "Unit not found."})
    relation_error = _validate_level_relations(payload)
    if relation_error:
        return relation_error

    next_sort_order = (
        Level.objects.filter(unit_id=unit_id).aggregate(max_sort_order=Max("sort_order"))[
            "max_sort_order"
        ]
        or 0
    ) + 1
    level = Level(unit=unit, layer=unit.layer, sort_order=next_sort_order)
    _apply_level_payload(level, payload)
    level.created_by = request.auth
    level.updated_by = request.auth
    level.save()
    return Level.objects.select_related("mascot").get(id=level.id)


@router.patch(
    "/levels/{level_id}",
    auth=jwt_auth,
    response={200: LevelOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a level",
)
@require_perm("game.change_level", message="You do not have permission to edit levels")
def update_level(request, level_id: int, payload: LevelWriteIn):
    try:
        level = Level.objects.select_related("mascot").get(id=level_id)
    except Level.DoesNotExist:
        return Status(404, {"detail": "Level not found."})
    relation_error = _validate_level_relations(payload)
    if relation_error:
        return relation_error

    _apply_level_payload(level, payload)
    level.updated_by = request.auth
    level.save()
    return Level.objects.select_related("mascot").get(id=level.id)


@router.delete(
    "/levels/{level_id}",
    auth=jwt_auth,
    response={204: None, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a level",
)
@require_perm("game.delete_level", message="You do not have permission to delete levels")
def delete_level(request, level_id: int):
    deleted, _ = Level.objects.filter(id=level_id).delete()
    if not deleted:
        return Status(404, {"detail": "Level not found."})
    return Status(204, None)


@router.put(
    "/units/{unit_id}/levels/order",
    auth=jwt_auth,
    response={200: UnitByIdOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Reorder levels within a unit",
)
@require_perm("game.change_level", message="You do not have permission to reorder levels")
def reorder_levels(request, unit_id: int, payload: LevelOrderIn):
    try:
        unit = Unit.objects.get(id=unit_id)
    except Unit.DoesNotExist:
        return Status(404, {"detail": "Unit not found."})

    levels = list(Level.objects.filter(unit_id=unit_id).order_by("sort_order", "id"))
    existing_ids = {level.id for level in levels}
    ordered_ids = payload.level_ids
    if len(ordered_ids) != len(set(ordered_ids)) or set(ordered_ids) != existing_ids:
        return Status(400, {"detail": "Level order must include each unit level exactly once."})

    levels_by_id = {level.id: level for level in levels}
    updated_at = timezone.now()
    with transaction.atomic():
        for sort_order, level_id in enumerate(ordered_ids, start=1):
            level = levels_by_id[level_id]
            level.sort_order = sort_order
            level.updated_by = request.auth
            level.updated_at = updated_at
        Level.objects.bulk_update(levels, ["sort_order", "updated_by", "updated_at"])

    return _unit_with_levels(unit.id)


@router.put(
    "/units/list-by-layer/{layer}/order",
    auth=jwt_auth,
    response={200: list[UnitByLayerOut], 400: ErrorOut, 403: ErrorOut},
    summary="[Admin] Reorder units within a layer",
)
@require_perm("game.change_unit", message="You do not have permission to reorder units")
def reorder_units(request, layer: Layer, payload: UnitOrderIn):
    units = list(Unit.objects.filter(layer=layer).order_by("sort_order", "id"))
    existing_ids = {unit.id for unit in units}
    ordered_ids = payload.unit_ids
    if len(ordered_ids) != len(set(ordered_ids)) or set(ordered_ids) != existing_ids:
        return Status(400, {"detail": "Unit order must include each layer unit exactly once."})

    units_by_id = {unit.id: unit for unit in units}
    updated_at = timezone.now()
    with transaction.atomic():
        for sort_order, unit_id in enumerate(ordered_ids, start=1):
            unit = units_by_id[unit_id]
            unit.sort_order = sort_order
            unit.updated_by = request.auth
            unit.updated_at = updated_at
        Unit.objects.bulk_update(units, ["sort_order", "updated_by", "updated_at"])

    levels = Level.objects.order_by("sort_order", "id")
    return (
        Unit.objects.filter(layer=layer)
        .prefetch_related(Prefetch("levels", queryset=levels))
        .order_by("sort_order", "id")
    )


@router.post(
    "/words",
    auth=jwt_auth,
    response={200: WordOut, 403: ErrorOut},
    summary="[Admin] Create a word",
)
@require_perm("game.add_word", message="You do not have permission to create words")
def create_word(
    request,
    data: Form[WordIn],
    image: File[UploadedFile] = None,
    audio: File[UploadedFile] = None,
):
    word = Word.objects.create(
        word=data.word,
        target_letter=data.target_letter or None,
        translation=data.translation or None,
        is_tutorial_word=data.is_tutorial_word,
        image=image,
        audio=audio,
        created_by=request.auth,
        updated_by=request.auth,
    )
    return 200, word


@router.get(
    "/words/list",
    auth=jwt_auth,
    response={200: list[WordOut], 403: ErrorOut},
    summary="[Admin] List all words",
)
@require_perm("game.view_word", message="You do not have permission to view words")
def list_words(request):
    return Word.objects.order_by("-updated_at", "-id")


@router.get(
    "/words/list-simple",
    response=list[WordSimpleOut],
    summary="[Public] List published words (simple version)",
)
def list_words_simple(request):
    qs = Word.objects.filter(is_active=True, is_published=True)
    return qs.only("id", "word", "target_letter", "is_tutorial_word", "image", "audio")


@router.patch(
    "/words/{word_id}",
    auth=jwt_auth,
    response={200: WordOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a word",
)
@require_perm("game.change_word", message="You do not have permission to update words")
def update_word(
    request,
    word_id: int,
    data: Form[WordIn],
    image: File[UploadedFile] = None,
    audio: File[UploadedFile] = None,
):
    try:
        word = Word.objects.get(id=word_id)
    except Word.DoesNotExist:
        return Status(404, {"detail": "Word not found."})

    word.word = data.word
    word.target_letter = data.target_letter or None
    word.translation = data.translation or None
    word.is_tutorial_word = data.is_tutorial_word
    if image is not None:
        word.image = image
    elif data.clear_image:
        if word.image:
            word.image.delete(save=False)
        word.image = None
    if audio is not None:
        word.audio = audio
    elif data.clear_audio:
        if word.audio:
            word.audio.delete(save=False)
        word.audio = None
    word.updated_by = request.auth
    word.save()
    return word


@router.delete(
    "/words/{word_id}",
    auth=jwt_auth,
    response={204: None, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a word",
)
@require_perm("game.delete_word", message="You do not have permission to delete words")
def delete_word(request, word_id: int):
    deleted, _ = Word.objects.filter(id=word_id).delete()
    if not deleted:
        return Status(404, {"detail": "Word not found."})
    return Status(204, None)


def _next_sentence_sort_order(story_id: int) -> int:
    return (
        Sentence.objects.filter(story_id=story_id).aggregate(max_sort_order=Max("sort_order"))[
            "max_sort_order"
        ]
        or 0
    ) + 1


def _apply_sentence_story(sentence: Sentence, story_id: int | None) -> Status | None:
    if story_id is None:
        sentence.story_id = None
        sentence.sort_order = None
        return None
    if not Story.objects.filter(id=story_id).exists():
        return Status(404, {"detail": "Story not found."})
    if sentence.story_id != story_id:
        sentence.story_id = story_id
        sentence.sort_order = _next_sentence_sort_order(story_id)
    return None


def _story_with_sentences(story_id: int) -> Story:
    return Story.objects.prefetch_related(
        Prefetch(
            "sentences",
            queryset=Sentence.objects.order_by("sort_order", "id"),
        )
    ).get(id=story_id)


@router.post(
    "/sentences",
    auth=jwt_auth,
    response={200: SentenceOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Create a sentence",
)
@require_perm("game.add_sentence", message="You do not have permission to create sentences")
def create_sentence(
    request,
    data: Form[SentenceIn],
    audio: File[UploadedFile] = None,
):
    sentence = Sentence(
        sentence=data.sentence,
        translation=data.translation or None,
        audio=audio,
        created_by=request.auth,
        updated_by=request.auth,
    )
    story_error = _apply_sentence_story(sentence, data.story_id)
    if story_error:
        return story_error
    sentence.save()
    return 200, sentence


@router.get(
    "/sentences/list",
    auth=jwt_auth,
    response={200: list[SentenceOut], 403: ErrorOut},
    summary="[Admin] List all sentences",
)
@require_perm("game.view_sentence", message="You do not have permission to view sentences")
def list_sentences(request):
    return Sentence.objects.order_by("story_id", "sort_order", "id")


@router.get(
    "/sentences/list-simple",
    response=list[SentenceSimpleOut],
    summary="[Public] List published sentences (simple version)",
)
def list_sentences_simple(request):
    return Sentence.objects.filter(is_active=True, is_published=True).only(
        "id", "sentence", "story_id", "sort_order", "audio"
    )


@router.patch(
    "/sentences/{sentence_id}",
    auth=jwt_auth,
    response={200: SentenceOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a sentence",
)
@require_perm("game.change_sentence", message="You do not have permission to update sentences")
def update_sentence(
    request,
    sentence_id: int,
    data: Form[SentenceIn],
    audio: File[UploadedFile] = None,
):
    try:
        sentence = Sentence.objects.get(id=sentence_id)
    except Sentence.DoesNotExist:
        return Status(404, {"detail": "Sentence not found."})

    sentence.sentence = data.sentence
    sentence.translation = data.translation or None
    story_error = _apply_sentence_story(sentence, data.story_id)
    if story_error:
        return story_error
    if audio is not None:
        sentence.audio = audio
    elif data.clear_audio:
        if sentence.audio:
            sentence.audio.delete(save=False)
        sentence.audio = None
    sentence.updated_by = request.auth
    sentence.save()
    return sentence


@router.delete(
    "/sentences/{sentence_id}",
    auth=jwt_auth,
    response={204: None, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a sentence",
)
@require_perm("game.delete_sentence", message="You do not have permission to delete sentences")
def delete_sentence(request, sentence_id: int):
    deleted, _ = Sentence.objects.filter(id=sentence_id).delete()
    if not deleted:
        return Status(404, {"detail": "Sentence not found."})
    return Status(204, None)


@router.post(
    "/stories",
    auth=jwt_auth,
    response={200: StoryOut, 403: ErrorOut},
    summary="[Admin] Create a story",
)
@require_perm("game.add_story", message="You do not have permission to create stories")
def create_story(request, payload: StoryIn):
    story = Story.objects.create(
        name=payload.name,
        is_published=payload.is_published,
        created_by=request.auth,
        updated_by=request.auth,
    )
    return _story_with_sentences(story.id)


@router.get(
    "/stories/list",
    auth=jwt_auth,
    response={200: list[StoryOut], 403: ErrorOut},
    summary="[Admin] List all stories",
)
@require_perm("game.view_story", message="You do not have permission to view stories")
def list_stories(request):
    return Story.objects.prefetch_related(
        Prefetch(
            "sentences",
            queryset=Sentence.objects.order_by("sort_order", "id"),
        )
    ).order_by("name", "id")


@router.get(
    "/stories/list-simple",
    response=list[StorySimpleOut],
    summary="[Public] List published stories (simple version)",
)
def list_stories_simple(request):
    return (
        Story.objects.filter(is_active=True, is_published=True)
        .prefetch_related(
            Prefetch(
                "sentences",
                queryset=Sentence.objects.order_by("sort_order", "id").only("id", "story_id"),
            )
        )
        .order_by("name", "id")
    )


@router.get(
    "/stories/{story_id}",
    auth=jwt_auth,
    response={200: StoryOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Get a story by ID",
)
@require_perm("game.view_story", message="You do not have permission to view stories")
def get_story(request, story_id: int):
    try:
        return _story_with_sentences(story_id)
    except Story.DoesNotExist:
        return Status(404, {"detail": "Story not found."})


@router.patch(
    "/stories/{story_id}",
    auth=jwt_auth,
    response={200: StoryOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a story",
)
@require_perm("game.change_story", message="You do not have permission to update stories")
def update_story(request, story_id: int, payload: StoryIn):
    try:
        story = Story.objects.get(id=story_id)
    except Story.DoesNotExist:
        return Status(404, {"detail": "Story not found."})

    story.name = payload.name
    story.is_published = payload.is_published
    story.updated_by = request.auth
    story.save()
    return _story_with_sentences(story.id)


@router.delete(
    "/stories/{story_id}",
    auth=jwt_auth,
    response={204: None, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a story",
)
@require_perm("game.delete_story", message="You do not have permission to delete stories")
def delete_story(request, story_id: int):
    deleted, _ = Story.objects.filter(id=story_id).delete()
    if not deleted:
        return Status(404, {"detail": "Story not found."})
    return Status(204, None)
