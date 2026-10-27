from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game", "0010_alter_word_target_letter_max_length"),
    ]

    operations = [
        migrations.RenameField(
            model_name="word",
            old_name="file",
            new_name="image",
        ),
        migrations.AlterField(
            model_name="word",
            name="image",
            field=models.ImageField(upload_to="words/"),
        ),
    ]
