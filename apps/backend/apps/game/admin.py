from django.contrib import admin

from apps.game.models import Level, LevelType, Mascot, Unit


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("title", "layer", "sort_order")
    list_filter = ("layer",)
    search_fields = ("title",)
    ordering = ("sort_order",)


@admin.register(LevelType)
class LevelTypeAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Mascot)
class MascotAdmin(admin.ModelAdmin):
    list_display = ("name", "idle_asset_path")
    search_fields = ("name",)


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "unit",
        "sort_order",
        "layer",
        "level_type",
        "show_mascot_on_splash",
    )
    list_filter = ("layer", "level_type", "unit")
    search_fields = ("title",)
    autocomplete_fields = ("unit", "level_type", "mascot")
    ordering = ("unit", "sort_order")
