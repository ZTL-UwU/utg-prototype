from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0017_story_and_sentence_audio'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='level',
            name='splash_background_asset_path',
        ),
    ]
