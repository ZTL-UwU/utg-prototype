from django.db import migrations, models


DEFAULT_LEVEL_TYPE = "education-letter-grid"


def convert_level_type_to_string(apps, schema_editor):
    Level = apps.get_model("game", "Level")
    LevelType = apps.get_model("game", "LevelType")
    level_types = {level_type.id: level_type for level_type in LevelType.objects.all()}

    for level in Level.objects.all():
        level_type = level_types.get(level.level_type_id)
        if level_type and level_type.name:
            level.level_type_key = level_type.name
        else:
            level.level_type_key = DEFAULT_LEVEL_TYPE
        level.save(update_fields=["level_type_key"])


class Migration(migrations.Migration):
    dependencies = [
        ("game", "0003_auditing_mixin"),
    ]

    operations = [
        migrations.AddField(
            model_name="level",
            name="level_type_key",
            field=models.CharField(default=DEFAULT_LEVEL_TYPE, max_length=255),
            preserve_default=False,
        ),
        migrations.RunPython(convert_level_type_to_string, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="level",
            name="level_type",
        ),
        migrations.RenameField(
            model_name="level",
            old_name="level_type_key",
            new_name="level_type",
        ),
        migrations.DeleteModel(
            name="LevelType",
        ),
    ]
