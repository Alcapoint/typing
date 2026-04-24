from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_user_country'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE users_user
            DROP COLUMN IF EXISTS email_verified;
            """,
            reverse_sql="""
            ALTER TABLE users_user
            ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
            """,
        ),
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS authtoken_token CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
