import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [value.strip() for value in os.getenv(name, default).split(",") if value.strip()]


def database_config() -> dict[str, object]:
    url = urlparse(os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/utg"))
    if url.scheme in {"postgres", "postgresql"}:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(url.path.lstrip("/")),
            "USER": unquote(url.username or ""),
            "PASSWORD": unquote(url.password or ""),
            "HOST": url.hostname or "",
            "PORT": url.port or 5432,
            "CONN_MAX_AGE": int(os.getenv("DATABASE_CONN_MAX_AGE", "60")),
            "OPTIONS": {"sslmode": os.getenv("DATABASE_SSL_MODE", "prefer")},
        }
    if url.scheme == "sqlite":
        path = unquote(url.path)
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": path if path not in {"", "/:memory:"} else ":memory:",
        }
    raise ValueError("DATABASE_URL must use postgresql://, postgres://, or sqlite://")


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-development-only")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
if not DEBUG and SECRET_KEY == "django-insecure-development-only":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false")
JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY")
if not DEBUG and not JWT_SIGNING_KEY:
    raise ImproperlyConfigured("JWT_SIGNING_KEY must be set when DJANGO_DEBUG is false")
JWT_SIGNING_KEY = JWT_SIGNING_KEY or SECRET_KEY

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "ninja_jwt",
    "storages",
    "apps.common",
    "apps.game",
    "apps.users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Required so PATCH/PUT multipart uploads populate request.FILES (Django only does this for POST).
    "ninja.compatibility.files.fix_request_files_middleware",
]

CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DATABASES = {"default": database_config()}
AUTH_USER_MODEL = "users.User"

NINJA_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "").strip()


def default_file_storage() -> dict[str, object]:
    if not AWS_STORAGE_BUCKET_NAME:
        return {"BACKEND": "django.core.files.storage.FileSystemStorage"}

    options: dict[str, object] = {
        "bucket_name": AWS_STORAGE_BUCKET_NAME,
        "file_overwrite": False,
        "default_acl": None,
        "querystring_auth": env_bool("AWS_QUERYSTRING_AUTH", True),
        # Required by R2 / Spaces / modern S3; SigV2 is rejected.
        "signature_version": os.getenv("AWS_S3_SIGNATURE_VERSION", "s3v4").strip() or "s3v4",
    }
    if access_key := os.getenv("AWS_ACCESS_KEY_ID", "").strip():
        options["access_key"] = access_key
    if secret_key := os.getenv("AWS_SECRET_ACCESS_KEY", "").strip():
        options["secret_key"] = secret_key
    if region_name := os.getenv("AWS_S3_REGION_NAME", "").strip():
        options["region_name"] = region_name
    if endpoint_url := os.getenv("AWS_S3_ENDPOINT_URL", "").strip():
        options["endpoint_url"] = endpoint_url
    if custom_domain := os.getenv("AWS_S3_CUSTOM_DOMAIN", "").strip():
        options["custom_domain"] = custom_domain

    return {"BACKEND": "storages.backends.s3.S3Storage", "OPTIONS": options}


STORAGES = {
    "default": default_file_storage(),
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@localhost")
if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = os.getenv(
        "EMAIL_BACKEND",
        "django.core.mail.backends.smtp.EmailBackend",
    )
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.resend.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "resend")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SESSION_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
if env_bool("DJANGO_TRUST_PROXY_HEADERS"):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
