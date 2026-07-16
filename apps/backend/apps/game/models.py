from django.db import models

from apps.common.models import AuditingMixin


class Layer(models.TextChoices):
    TYPING = "typing", "Typing"
    EDUCATION = "education", "Education"
    GAMES = "game", "Game"


class LevelType(models.TextChoices):
    EDUCATION_LETTER_GRID = "education-letter-grid", "Education letter grid"


class Unit(AuditingMixin, models.Model):
    sort_order = models.IntegerField(db_index=True)
    layer = models.CharField(max_length=20, choices=Layer.choices)
    title = models.CharField(max_length=255)
    title_font_size = models.PositiveIntegerField()
    background_asset_path = models.CharField(max_length=255)

    class Meta:
        db_table = "units"
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.title


class Mascot(AuditingMixin, models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    idle_asset_path = models.CharField(max_length=255)
    zero_star_asset_path = models.CharField(max_length=255, db_column="0_star_asset_path")
    one_star_asset_path = models.CharField(max_length=255, db_column="1_star_asset_path")
    two_star_asset_path = models.CharField(max_length=255, db_column="2_star_asset_path")
    three_star_asset_path = models.CharField(max_length=255, db_column="3_star_asset_path")

    class Meta:
        db_table = "mascots"

    def __str__(self) -> str:
        return self.name or f"Mascot {self.pk}"


class Level(AuditingMixin, models.Model):
    sort_order = models.IntegerField(db_index=True)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="levels")
    layer = models.CharField(max_length=20, choices=Layer.choices)
    title = models.CharField(max_length=255, null=True, blank=True)
    level_type = models.CharField(max_length=255)  # allow-list is LevelType; validated in API
    level_props = models.JSONField()
    mascot = models.ForeignKey(
        Mascot,
        on_delete=models.SET_NULL,
        related_name="levels",
        null=True,
        blank=True,
    )
    splash_background_asset_path = models.CharField(max_length=255)
    splash_button_color = models.BigIntegerField(null=True, blank=True)
    splash_button_text_color = models.BigIntegerField(null=True, blank=True)
    splash_level_font_color = models.BigIntegerField(null=True, blank=True)
    splash_level_title_color = models.BigIntegerField(null=True, blank=True)
    show_mascot_on_splash = models.BooleanField(default=False)

    class Meta:
        db_table = "levels"
        ordering = ["unit_id", "sort_order", "id"]

    def __str__(self) -> str:
        return self.title or f"Level {self.pk}"
