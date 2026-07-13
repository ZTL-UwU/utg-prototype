from django.db.models import Prefetch
from ninja import Router

from apps.game.models import Level, Unit
from apps.game.schemas import SidebarLevelOut, UnitOut

router = Router(tags=["game"])


@router.get("/units/list", response=list[UnitOut], summary="List units and their levels")
def list_units(request):
    levels = Level.objects.select_related("level_type", "mascot").order_by("sort_order", "id")
    return Unit.objects.prefetch_related(Prefetch("levels", queryset=levels))


@router.get(
    "/levels/sidebar",
    response=list[SidebarLevelOut],
    summary="List levels for admin sidebar navigation",
)
def list_sidebar_levels(request):
    return (
        Level.objects.select_related("level_type", "unit")
        .only(
            "id",
            "layer",
            "title",
            "sort_order",
            "unit_id",
            "level_type_id",
            "level_type__name",
            "unit__sort_order",
        )
        .order_by("unit__sort_order", "unit_id", "sort_order", "id")
    )
