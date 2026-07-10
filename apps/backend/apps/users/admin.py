from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.forms import UserChangeForm, UserCreationForm
from apps.users.models import LevelResult, Reward, User, UserReward


class UserRewardInline(admin.TabularInline):
    model = UserReward
    extra = 0
    autocomplete_fields = ("reward",)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    list_display = ("email", "name", "total_score", "total_stars", "is_staff")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "name")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")
    inlines = (UserRewardInline,)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("name", "total_score", "total_stars")}),
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
                "fields": ("email", "name", "password1", "password2", "is_staff", "is_active"),
            },
        ),
    )
    readonly_fields = ("last_login", "date_joined")


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ("name", "asset_path")
    search_fields = ("name",)


@admin.register(LevelResult)
class LevelResultAdmin(admin.ModelAdmin):
    list_display = ("user", "level", "star", "score", "correct", "mistake", "created_at")
    list_filter = ("star", "created_at")
    search_fields = ("user__email", "level__title")
    autocomplete_fields = ("user", "level")
    readonly_fields = ("created_at",)
