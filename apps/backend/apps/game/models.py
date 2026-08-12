from django.db import models

from apps.common.models import AuditingMixin, Layer


class LevelType(models.TextChoices):
    EDUCATION_LETTER_GRID = "education-letter-grid", "Education letter grid"
    EDUCATION_BUBBLE = "education-bubble", "Education bubble"
    EDUCATION_SHEEP = "education-sheep", "Education sheep"
    EDUCATION_IMAGE = "education-image", "Education image"
    EDUCATION_WORD = "education-word", "Education word"
    EDUCATION_SHEEP_JUMP = "education-sheep-jump", "Education sheep jump"
    EDUCATION_WHACK_A_MOLE = "education-whack-a-mole", "Education whack-a-mole"
    TYPING_DESERT = "typing-desert", "Typing desert"
    TYPING_SANDSTORM = "typing-sandstorm", "Typing sandstorm"
    TYPING_INSTRUMENT = "typing-instrument", "Typing instrument"
    TYPING_WORD = "typing-word", "Typing word"
    TYPING_MARKET = "typing-market", "Typing market"
    TYPING_STORY = "typing-story", "Typing story"
    TYPING_GOAT = "typing-goat", "Typing goat"
    GAME_TANDOOR_RUSH = "game-tandoor-rush", "Game tandoor rush"
    GAME_NAAN_STACK = "game-naan-stack", "Game stack the naan"
    GAME_FRUIT_FALL = "game-fruit-fall", "Game fruit fall",
    GAME_KITE = "game-kite", "Game kite",
    GAME_FLYING = "game-flying", "Game flying",
    GAME_SKI = "game-ski", "Game ski racing",
    GAME_TROUT = "game-trout", "Game trout"


class Unit(AuditingMixin, models.Model):
    sort_order = models.IntegerField(db_index=True)
    layer = models.CharField(max_length=20, choices=Layer.choices)
    title = models.CharField(max_length=255)
    title_font_size = models.PositiveIntegerField()
    title_font_color = models.BigIntegerField(default=0xFFFFFF)
    title_is_curved = models.BooleanField(default=False)
    subtitle_text = models.CharField(max_length=255, null=True, blank=True)
    subtitle_font_size = models.PositiveIntegerField(null=True, blank=True)
    subtitle_font_color = models.BigIntegerField(null=True, blank=True)
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
    splash_button_color = models.BigIntegerField(null=True, blank=True)
    splash_button_text_color = models.BigIntegerField(null=True, blank=True)
    splash_level_font_color = models.BigIntegerField(null=True, blank=True)
    splash_level_title_color = models.BigIntegerField(null=True, blank=True)
    show_mascot_on_splash = models.BooleanField(default=False)
    backdrop_color = models.BigIntegerField(default=0)

    class Meta:
        db_table = "levels"
        ordering = ["unit_id", "sort_order", "id"]

    def __str__(self) -> str:
        return self.title or f"Level {self.pk}"


class Word(AuditingMixin, models.Model):
    word = models.CharField(max_length=255)
    target_letter = models.CharField(null=True, blank=True, max_length=255)
    translation = models.CharField(null=True, blank=True, max_length=255)
    is_tutorial_word = models.BooleanField(default=False)
    image = models.ImageField(upload_to="words/", null=True, blank=True)
    audio = models.FileField(upload_to="words/audio/", null=True, blank=True)

    class Meta:
        db_table = "words"

    def __str__(self) -> str:
        return self.word


class Story(AuditingMixin, models.Model):
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "stories"

    def __str__(self) -> str:
        return self.name


class Sentence(AuditingMixin, models.Model):
    sentence = models.TextField()
    translation = models.TextField(null=True, blank=True)
    audio = models.FileField(upload_to="sentences/audio/", null=True, blank=True)
    story = models.ForeignKey(
        Story,
        on_delete=models.SET_NULL,
        related_name="sentences",
        null=True,
        blank=True,
    )
    sort_order = models.IntegerField(db_index=True, null=True, blank=True)

    class Meta:
        db_table = "sentences"
        ordering = ["story_id", "sort_order", "id"]

    def __str__(self) -> str:
        return self.sentence
