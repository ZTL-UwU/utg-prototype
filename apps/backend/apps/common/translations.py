from django.db import models

from apps.common.models import TranslationLocale


def translations_for(obj: models.Model, field: str) -> dict[str, str]:
    """`{locale: text}` for one field. Reads `obj.translations`, so prefetch it for lists."""
    return {row.locale: row.text for row in obj.translations.all() if row.field == field}


def set_translations(obj: models.Model, field: str, values: dict[str, str]) -> None:
    """
    Write the given locales of one field; a blank text removes that locale, so it falls back
    to the source text again. Locales left out of `values` are not touched. `obj` must be saved.
    """
    for locale, raw_text in values.items():
        if locale not in TranslationLocale.values:
            raise ValueError(f"Unsupported locale: {locale}")
        text = raw_text.strip()
        if text:
            obj.translations.update_or_create(field=field, locale=locale, defaults={"text": text})
        else:
            obj.translations.filter(field=field, locale=locale).delete()
