from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import migrations, models

BUNDLED_MASCOTS = (
    settings.BASE_DIR.parent / "utg-prototype" / "apps" / "game" / "assets" / "mascots{m}"
)

IMAGE_FIELDS = (
    "idle_image",
    "zero_star_image",
    "one_star_image",
    "two_star_image",
    "three_star_image",
)


def _source_paths(mascot_name: str) -> dict[str, Path]:
    folder = BUNDLED_MASCOTS / mascot_name.lower()
    return {
        "idle_image": folder / "default.png",
        "zero_star_image": folder / "dialog" / "0-star.png",
        "one_star_image": folder / "dialog" / "1-star.png",
        "two_star_image": folder / "dialog" / "2-star.png",
        "three_star_image": folder / "dialog" / "3-star.png",
    }


def copy_bundled_mascot_images(apps, schema_editor):
    Mascot = apps.get_model("game", "Mascot")
    missing: list[str] = []

    for mascot in Mascot.objects.all():
        name = (mascot.name or f"mascot-{mascot.pk}").strip()
        sources = _source_paths(name)
        for field_name, source in sources.items():
            if not source.is_file():
                missing.append(str(source))
                continue
            relative_name = f"{name.lower()}/{source.name}"
            getattr(mascot, field_name).save(
                relative_name,
                ContentFile(source.read_bytes()),
                save=False,
            )
        mascot.save(update_fields=list(IMAGE_FIELDS))

    if missing:
        raise FileNotFoundError(
            "Bundled mascot images were missing; cannot convert asset paths to ImageFields:\n"
            + "\n".join(missing)
        )


class Migration(migrations.Migration):
    dependencies = [
        ("game", "0018_remove_level_splash_background_asset_path"),
    ]

    operations = [
        migrations.AddField(
            model_name="mascot",
            name="idle_image",
            field=models.ImageField(null=True, upload_to="mascots/"),
        ),
        migrations.AddField(
            model_name="mascot",
            name="zero_star_image",
            field=models.ImageField(null=True, upload_to="mascots/"),
        ),
        migrations.AddField(
            model_name="mascot",
            name="one_star_image",
            field=models.ImageField(null=True, upload_to="mascots/"),
        ),
        migrations.AddField(
            model_name="mascot",
            name="two_star_image",
            field=models.ImageField(null=True, upload_to="mascots/"),
        ),
        migrations.AddField(
            model_name="mascot",
            name="three_star_image",
            field=models.ImageField(null=True, upload_to="mascots/"),
        ),
        migrations.RunPython(copy_bundled_mascot_images, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="mascot",
            name="idle_asset_path",
        ),
        migrations.RemoveField(
            model_name="mascot",
            name="zero_star_asset_path",
        ),
        migrations.RemoveField(
            model_name="mascot",
            name="one_star_asset_path",
        ),
        migrations.RemoveField(
            model_name="mascot",
            name="two_star_asset_path",
        ),
        migrations.RemoveField(
            model_name="mascot",
            name="three_star_asset_path",
        ),
        migrations.AlterField(
            model_name="mascot",
            name="idle_image",
            field=models.ImageField(upload_to="mascots/"),
        ),
        migrations.AlterField(
            model_name="mascot",
            name="zero_star_image",
            field=models.ImageField(upload_to="mascots/"),
        ),
        migrations.AlterField(
            model_name="mascot",
            name="one_star_image",
            field=models.ImageField(upload_to="mascots/"),
        ),
        migrations.AlterField(
            model_name="mascot",
            name="two_star_image",
            field=models.ImageField(upload_to="mascots/"),
        ),
        migrations.AlterField(
            model_name="mascot",
            name="three_star_image",
            field=models.ImageField(upload_to="mascots/"),
        ),
    ]
