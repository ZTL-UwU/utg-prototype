from django.db import transaction
from django.db.models import Max, Prefetch
from django.utils import timezone
from ninja import File, Form, Router, Status, UploadedFile
from ninja_jwt.authentication import JWTAuth

from apps.game.models import Layer, Level, LevelType, Mascot, Unit, Word
from apps.game.schemas import (
    ErrorOut,
    LevelOrderIn,
    LevelOut,
    LevelWriteIn,
    MascotOut,
    SidebarUnitOut,
    UnitByIdOut,
    UnitByLayerOut,
    UnitOrderIn,
    UnitOut,
    UnitUpdateIn,
    WordIn,
    WordOut,
)

router = Router(tags=["game"])
jwt_auth = JWTAuth()


def _unit_with_levels(unit_id: int) -> Unit:
    levels = Level.objects.select_related("mascot").order_by("sort_order", "id")
    return Unit.objects.prefetch_related(Prefetch("levels", queryset=levels)).get(id=unit_id)


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


@router.get("/units/list", response=list[UnitOut], summary="List published units and their published levels")
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
    response=list[SidebarUnitOut],
    summary="List units for admin sidebar navigation",
)
def list_sidebar_units(request):
    return Unit.objects.only("id", "layer", "title", "sort_order").order_by("sort_order", "id")


@router.get(
    "/mascots/list",
    response=list[MascotOut],
    summary="List mascots for admin editing",
)
def list_mascots(request):
    return Mascot.objects.order_by("name", "id")


@router.get(
    "/units/list-by-layer/{layer}",
    response=list[UnitByLayerOut],
    summary="List units by layer",
)
def list_units_by_layer(request, layer: Layer):
    levels = Level.objects.order_by("sort_order", "id")
    return (
        Unit.objects.filter(layer=layer)
        .prefetch_related(Prefetch("levels", queryset=levels))
        .order_by("sort_order", "id")
    )


@router.get("/units/{unit_id}", response=UnitByIdOut, summary="Get a unit by ID")
def get_unit(request, unit_id: int):
    return _unit_with_levels(unit_id)


@router.patch(
    "/units/{unit_id}",
    auth=jwt_auth,
    response={200: UnitByIdOut, 404: ErrorOut},
    summary="Update a unit",
)
def update_unit(request, unit_id: int, payload: UnitUpdateIn):
    if not(request.auth.has_perm("game.change_unit")):
        return Status(403, {"detail": "You do not have permissions to edit units"})
    try:
        unit = _unit_with_levels(unit_id)
    except Unit.DoesNotExist:
        return Status(404, {"detail": "Unit not found."})

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
    unit.updated_by = request.auth
    unit.save()
    return unit


@router.post(
    "/units/{unit_id}/levels",
    auth=jwt_auth,
    response={200: LevelOut, 404: ErrorOut},
    summary="Create a level in a unit",
)
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
    response={200: LevelOut, 404: ErrorOut},
    summary="Update a level",
)
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
    response={204: None, 404: ErrorOut},
    summary="Delete a level",
)
def delete_level(request, level_id: int):
    deleted, _ = Level.objects.filter(id=level_id).delete()
    if not deleted:
        return Status(404, {"detail": "Level not found."})
    return Status(204, None)


@router.put(
    "/units/{unit_id}/levels/order",
    auth=jwt_auth,
    response={200: UnitByIdOut, 400: ErrorOut, 404: ErrorOut},
    summary="Reorder levels within a unit",
)
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
    response={200: list[UnitByLayerOut], 400: ErrorOut},
    summary="Reorder units within a layer",
)
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

@router.post("/words", auth=jwt_auth, response={200:WordOut, 403: ErrorOut})
def create_word(request, data:Form[WordIn], image:File[UploadedFile]):
    if not(request.auth.has_perm("word.createWord")):
        return Status(403, {"detail":"You do not have permission to create words"})
    word = Word.objects.create(word = data.word, target_letter = data.target_letter, image = image)
    return 200, word