from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Layer(models.TextChoices):
    TYPING = "typing", "Typing"
    EDUCATION = "education", "Education"
    GAMES = "game", "Game"


class AuditingMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_updated",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    is_published = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True


class TranslationLocale(models.TextChoices):
    """Locales content can be translated into. The source text in each model is English."""

    TURKISH = "tr", "Turkish"


class Translation(models.Model):
    """
    One field of one row, in one locale. Any model can point at its rows through a
    `GenericRelation(Translation)`; a field with no row for a locale shows its source text.
    """

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    field = models.CharField(max_length=64)
    locale = models.CharField(max_length=16, choices=TranslationLocale.choices)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "translations"
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id", "field", "locale"],
                name="translations_unique_field_locale",
            )
        ]
        indexes = [models.Index(fields=["content_type", "object_id"])]

    def __str__(self) -> str:
        return f"{self.content_type.model}:{self.object_id}.{self.field} [{self.locale}]"
