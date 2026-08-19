from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.forms import UserChangeForm, UserCreationForm
from apps.users.models import LevelResult, Reward, RewardImage, User, UserReward


class UserRewardInline(admin.TabularInline):
    model = UserReward
    fk_name = "user"
    extra = 0
    autocomplete_fields = ("reward",)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    list_display = ("email", "name", "is_staff", "is_cheat")
    list_filter = ("is_staff", "is_superuser", "is_active", "is_cheat")
    list_editable = ("is_cheat",)
    search_fields = ("email", "name")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")
    inlines = (UserRewardInline,)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("name", "is_cheat")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "name",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_active",
                    "is_cheat",
                ),
            },
        ),
    )
    readonly_fields = ("last_login", "date_joined")


@admin.register(RewardImage)
class RewardImageAdmin(admin.ModelAdmin):
    list_display = ("name", "image")
    search_fields = ("name",)


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ("type", "layer", "level", "image")
    list_filter = ("type", "layer")
    search_fields = ("type", "layer")
    autocomplete_fields = ("level", "image")


@admin.register(LevelResult)
class LevelResultAdmin(admin.ModelAdmin):
    list_display = ("user", "level", "star", "score", "correct", "mistake", "created_at")
    list_filter = ("star", "created_at")
    search_fields = ("user__email", "level__title")
    autocomplete_fields = ("user", "level")
    readonly_fields = ("created_at", "updated_at")
