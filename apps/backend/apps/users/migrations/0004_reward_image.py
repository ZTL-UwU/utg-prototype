import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def delete_legacy_rewards(apps, schema_editor):
    Reward = apps.get_model("users", "Reward")
    UserReward = apps.get_model("users", "UserReward")
    UserReward.objects.all().delete()
    Reward.objects.all().delete()
    # PostgreSQL queues FK trigger events on DELETE; flush them before ALTER TABLE.
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


class Migration(migrations.Migration):

    dependencies = [
        ("game", "0018_remove_level_splash_background_asset_path"),
        ("users", "0003_auditing_mixin_userreward_levelresult"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RewardImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("is_published", models.BooleanField(db_index=True, default=True)),
                ("name", models.CharField(max_length=255)),
                ("image", models.ImageField(upload_to="rewards/")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "reward_images",
            },
        ),
        migrations.RunPython(delete_legacy_rewards, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="reward",
            name="asset_path",
        ),
        migrations.RemoveField(
            model_name="reward",
            name="name",
        ),
        migrations.AddField(
            model_name="reward",
            name="image",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="rewards",
                to="users.rewardimage",
            ),
        ),
        migrations.AddField(
            model_name="reward",
            name="layer",
            field=models.CharField(
                choices=[("typing", "Typing"), ("education", "Education"), ("game", "Game")],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="reward",
            name="level",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="rewards",
                to="game.level",
            ),
        ),
        migrations.AddField(
            model_name="reward",
            name="type",
            field=models.CharField(
                choices=[
                    ("level_completion_badge", "Level completion badge"),
                    ("level_three_stars_badge", "Level three stars badge"),
                    ("level_perfect_badge", "Level perfect badge"),
                    ("three_consecutive_three_stars_trophy", "Three consecutive three stars trophy"),
                ],
                max_length=255,
            ),
        ),
        migrations.AddConstraint(
            model_name="reward",
            constraint=models.UniqueConstraint(
                fields=("type", "level"),
                condition=models.Q(level__isnull=False),
                name="unique_reward_type_level",
            ),
        ),
        migrations.AddConstraint(
            model_name="reward",
            constraint=models.UniqueConstraint(
                fields=("type", "layer"),
                condition=models.Q(level__isnull=True),
                name="unique_reward_type_layer",
            ),
        ),
    ]
