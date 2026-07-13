from django.db.models import Prefetch
from ninja import Router

from apps.game.models import Level, Unit
from apps.game.schemas import SidebarUnitOut, UnitOut

router = Router(tags=["game"])


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
