from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_fix_reward_unique_indexes"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="total_score",
        ),
        migrations.RemoveField(
            model_name="user",
            name="total_stars",
        ),
    ]
