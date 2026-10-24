from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game", "0020_mascot_sad_image"),
    ]

    operations = [
        # Rename only; the stored key (e.g. "words/audio/foo.mp3") and the object in
        # storage are untouched, so existing recordings keep working.
        migrations.RenameField(
            model_name="word",
            old_name="audio",
            new_name="education_audio",
        ),
        migrations.AddField(
            model_name="word",
            name="standard_audio",
            field=models.FileField(
                blank=True, null=True, upload_to="words/audio/standard/"
            ),
        ),
    ]
