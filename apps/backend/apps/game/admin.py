from django.contrib import admin

from apps.game.models import Level, Mascot, Sentence, Unit, Word


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("title", "layer", "sort_order")
    list_filter = ("layer",)
    search_fields = ("title",)
    ordering = ("sort_order",)


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
    search_fields = ("title", "level_type")
    autocomplete_fields = ("unit", "mascot")
    ordering = ("unit", "sort_order")


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ("word", "target_letter", "image", "audio")
    list_filter = ("target_letter",)
    search_fields = ("word", "target_letter")


@admin.register(Sentence)
class SentenceAdmin(admin.ModelAdmin):
    list_display = ("sentence", "translation", "is_published", "is_active")
    list_filter = ("is_published", "is_active")
    search_fields = ("sentence", "translation")
