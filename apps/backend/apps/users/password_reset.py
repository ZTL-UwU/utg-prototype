from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def build_password_reset_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?uid={uid}&token={token}"


def send_password_reset_email(user) -> None:
    link = build_password_reset_link(user)
    send_mail(
        subject="[Sozler Saylisi] Reset your password",
        message=(
            "Use the link below to reset your password.\n\n"
            f"{link}\n\n"
            "If you did not request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
