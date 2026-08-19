from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0006_remove_user_total_score_total_stars"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_cheat",
            field=models.BooleanField(
                default=False,
                help_text="Unlocks every published level for this user, skipping normal progression.",
                verbose_name="cheat",
            ),
        ),
    ]
