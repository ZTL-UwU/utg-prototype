from django.db.models import Prefetch
from ninja import Router, Status
from ninja_jwt.authentication import JWTAuth

from apps.game.models import Layer, Level, Unit
from apps.game.schemas import (
    ErrorOut,
    SidebarUnitOut,
    UnitByIdOut,
    UnitByLayerOut,
    UnitOut,
    UnitUpdateIn,
)

router = Router(tags=["game"])
jwt_auth = JWTAuth()


def _unit_with_levels(unit_id: int) -> Unit:
    levels = Level.objects.order_by("sort_order", "id")
    return Unit.objects.prefetch_related(Prefetch("levels", queryset=levels)).get(id=unit_id)


@router.get("/units/list", response=list[UnitOut], summary="List units and their levels")
def list_units(request):
    levels = Level.objects.select_related("level_type", "mascot").order_by("sort_order", "id")
    return Unit.objects.prefetch_related(Prefetch("levels", queryset=levels))


@router.get(
    "/units/sidebar",
    response=list[SidebarUnitOut],
    summary="List units for admin sidebar navigation",
)
def list_sidebar_units(request):
    return Unit.objects.only("id", "layer", "title", "sort_order").order_by("sort_order", "id")


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


# Not including sort_order because it will be in a separate API
# TODO: permission check for update
@router.patch(
    "/units/{unit_id}",
    auth=jwt_auth,
    response={200: UnitByIdOut, 404: ErrorOut},
    summary="Update a unit",
)
def update_unit(request, unit_id: int, payload: UnitUpdateIn):
    try:
        unit = _unit_with_levels(unit_id)
    except Unit.DoesNotExist:
        return Status(404, {"detail": "Unit not found."})

    unit.layer = payload.layer
    unit.title = payload.title
    unit.title_font_size = payload.title_font_size
    unit.background_asset_path = payload.background_asset_path
    unit.is_published = payload.is_published
    unit.updated_by = request.auth
    unit.save()
    return unit
