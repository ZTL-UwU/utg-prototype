# UTG backend

## Requirements

- Python 3.14
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL 18, or Docker with Compose

## Local setup

```bash
cp .env.example .env

# Start the database
docker compose up -d db

# Install dependencies
uv sync

# Run migrations
set -a; source .env; set +a
uv run python manage.py migrate

# Create a superuser
uv run python manage.py createsuperuser

# Run the server
uv run python manage.py runserver
```

The service is then available at:

- API: [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)
- OpenAPI docs: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
- Admin: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

## Configuration

Configuration is environment-driven. See `[.env.example](.env.example)` for a complete local
example.

| Variable                | Default                                             | Purpose                                               |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`          | `postgresql://postgres:postgres@localhost:5432/utg` | PostgreSQL connection URL                      |
| `DJANGO_SECRET_KEY`     | development-only value                              | Django signing key; required when debug is off |
| `JWT_SIGNING_KEY`        | `DJANGO_SECRET_KEY` in development                  | JWT signing key; explicitly required when debug is off |
| `DJANGO_DEBUG`          | `true`                                              | Enables Django debug mode                      |
| `DJANGO_ALLOWED_HOSTS`  | `localhost,127.0.0.1`                               | Comma-separated hostnames                      |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated frontend origins for CORS |
| `DATABASE_CONN_MAX_AGE` | `60`                                                | Persistent connection lifetime in seconds      |
| `DATABASE_SSL_MODE`     | `prefer`                                            | PostgreSQL SSL mode                            |

### Generating `JWT_SIGNING_KEY`

Use a long random secret (do not reuse `DJANGO_SECRET_KEY` in production):

```bash
openssl rand -base64 64
```

Copy the output into `.env` as `JWT_SIGNING_KEY=...`.

## Development checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run python manage.py makemigrations --check --dry-run
uv run python manage.py check
```
