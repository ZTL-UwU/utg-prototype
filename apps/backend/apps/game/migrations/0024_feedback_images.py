import apps.game.models
import django.db.models.deletion
from django.db import migrations, models


def copy_feedback_images(apps, schema_editor):
    Feedback = apps.get_model("game", "Feedback")
    FeedbackImage = apps.get_model("game", "FeedbackImage")
    rows = []
    for feedback in Feedback.objects.all().iterator():
        name = feedback.image.name
        if not name:
            continue
        rows.append(
            FeedbackImage(
                feedback_id=feedback.id,
                image=name,
                kind="screenshot",
                sort_order=0,
            )
        )
    if rows:
        FeedbackImage.objects.bulk_create(rows)


class Migration(migrations.Migration):
    dependencies = [
        ("game", "0023_feedback_is_resolved"),
    ]

    operations = [
        migrations.CreateModel(
            name="FeedbackImage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "image",
                    models.ImageField(upload_to=apps.game.models.feedback_image_upload_to),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[("screenshot", "Screenshot"), ("upload", "Upload")],
                        default="upload",
                        max_length=16,
                    ),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "feedback",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="game.feedback",
                    ),
                ),
            ],
            options={
                "db_table": "feedback_images",
                "ordering": ["sort_order", "id"],
            },
        ),
        migrations.RunPython(copy_feedback_images, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="feedback",
            name="image",
        ),
    ]
