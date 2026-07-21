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
| `DJANGO_CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174` | Comma-separated frontend origins for CORS (admin :5173, game :5174) |
| `DATABASE_CONN_MAX_AGE` | `60`                                                | Persistent connection lifetime in seconds      |
| `DATABASE_SSL_MODE`     | `prefer`                                            | PostgreSQL SSL mode                            |
| `AWS_STORAGE_BUCKET_NAME` | unset                                             | When set, media (`FileField`) is stored on S3  |
| `AWS_ACCESS_KEY_ID`     | unset                                               | S3 access key (optional if using IAM role)     |
| `AWS_SECRET_ACCESS_KEY` | unset                                               | S3 secret key (optional if using IAM role)     |
| `AWS_S3_REGION_NAME`     | unset                                               | S3 region                                      |
| `AWS_S3_ENDPOINT_URL`    | unset                                               | Custom endpoint (R2, MinIO, Tigris, etc.)      |
| `AWS_S3_CUSTOM_DOMAIN`   | unset                                               | CDN / custom domain for media URLs             |
| `AWS_S3_SIGNATURE_VERSION` | `s3v4`                                            | S3 request signing (SigV4; required by R2 etc.) |
| `AWS_QUERYSTRING_AUTH`   | `true`                                              | Use signed URLs for media                      |

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
