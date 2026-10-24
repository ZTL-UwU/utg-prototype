from django.contrib import admin

from apps.game.models import Feedback, FeedbackImage, Level, Mascot, Sentence, Story, Unit, Word


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("title", "layer", "sort_order")
    list_filter = ("layer",)
    search_fields = ("title",)
    ordering = ("sort_order",)


@admin.register(Mascot)
class MascotAdmin(admin.ModelAdmin):
    list_display = ("name", "idle_image")
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
    list_display = ("word", "target_letter", "image", "education_audio", "standard_audio")
    list_filter = ("target_letter",)
    search_fields = ("word", "target_letter")


class SentenceInline(admin.TabularInline):
    model = Sentence
    extra = 0
    fields = ("sentence", "translation", "audio", "sort_order", "is_published", "is_active")
    ordering = ("sort_order", "id")
    show_change_link = True


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_published", "is_active")
    list_filter = ("is_published", "is_active")
    search_fields = ("name",)
    inlines = (SentenceInline,)


@admin.register(Sentence)
class SentenceAdmin(admin.ModelAdmin):
    list_display = ("sentence", "story", "sort_order", "translation", "audio", "is_published")
    list_filter = ("story", "is_published", "is_active")
    search_fields = ("sentence", "translation")
    autocomplete_fields = ("story",)
    ordering = ("story", "sort_order", "id")


class FeedbackImageInline(admin.TabularInline):
    model = FeedbackImage
    extra = 0
    fields = ("image", "kind", "sort_order")


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("id", "request_type", "title", "user", "is_resolved", "created_at")
    list_filter = ("request_type", "is_resolved")
    search_fields = ("title", "description", "screen", "user__email", "user__name")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("user",)
    ordering = ("-created_at", "-id")
    inlines = [FeedbackImageInline]
