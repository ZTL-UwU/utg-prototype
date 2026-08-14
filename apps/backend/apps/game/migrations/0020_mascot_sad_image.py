from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import migrations, models

BUNDLED_MASCOTS = (
    settings.BASE_DIR.parent / "utg-prototype" / "apps" / "game" / "assets" / "mascots{m}"
)


def _sad_source(mascot_name: str) -> Path:
    named = BUNDLED_MASCOTS / mascot_name.lower() / "sad.png"
    if named.is_file():
        return named
    return BUNDLED_MASCOTS / "sheep" / "sad.png"


def copy_bundled_sad_images(apps, schema_editor):
    Mascot = apps.get_model("game", "Mascot")
    missing: list[str] = []

    for mascot in Mascot.objects.all():
        name = (mascot.name or f"mascot-{mascot.pk}").strip()
        source = _sad_source(name)
        if not source.is_file():
            missing.append(str(source))
            continue
        mascot.sad_image.save(
            f"{name.lower()}/{source.name}",
            ContentFile(source.read_bytes()),
            save=False,
        )
        mascot.save(update_fields=["sad_image"])

    if missing:
        raise FileNotFoundError(
            "Bundled sad mascot images were missing; cannot add sad_image:\n" + "\n".join(missing)
        )


class Migration(migrations.Migration):
    dependencies = [
        ("game", "0019_mascot_images"),
    ]

    operations = [
        migrations.AddField(
            model_name="mascot",
            name="sad_image",
            field=models.ImageField(null=True, upload_to="mascots/"),
        ),
        migrations.RunPython(copy_bundled_sad_images, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="mascot",
            name="sad_image",
            field=models.ImageField(upload_to="mascots/"),
        ),
    ]
