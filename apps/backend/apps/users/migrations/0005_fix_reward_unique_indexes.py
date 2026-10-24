from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_reward_image"),
    ]

    operations = [
        # 0004 may have been applied before the partial unique indexes were in
        # the migration file, leaving UNIQUE (type, level_id) and no layer index.
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE rewards DROP CONSTRAINT IF EXISTS unique_reward_type_level;
                    DROP INDEX IF EXISTS unique_reward_type_level;
                    DROP INDEX IF EXISTS unique_reward_type_layer;
                    CREATE UNIQUE INDEX unique_reward_type_level
                        ON rewards (type, level_id) WHERE level_id IS NOT NULL;
                    CREATE UNIQUE INDEX unique_reward_type_layer
                        ON rewards (type, layer) WHERE level_id IS NULL;
                    """,
                    reverse_sql="""
                    DROP INDEX IF EXISTS unique_reward_type_level;
                    DROP INDEX IF EXISTS unique_reward_type_layer;
                    ALTER TABLE rewards
                        ADD CONSTRAINT unique_reward_type_level UNIQUE (type, level_id);
                    """,
                ),
            ],
            state_operations=[],
        ),
    ]
