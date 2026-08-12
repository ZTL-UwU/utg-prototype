from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from ninja import Router, Status
from ninja.throttling import AnonRateThrottle
from ninja_jwt.exceptions import TokenError
from ninja_jwt.tokens import RefreshToken

from apps.common.auth import jwt_auth
from apps.game.models import Level
from apps.users.models import LevelResult
from apps.users.password_reset import send_password_reset_email
from apps.users.schemas import (
    DetailOut,
    ErrorOut,
    LevelResultCreateOut,
    LevelResultIn,
    LevelResultOut,
    LoginIn,
    LoginTokenPairOut,
    PasswordResetConfirmIn,
    PasswordResetRequestIn,
    RefreshedAccessTokenOut,
    RefreshTokenIn,
    RegisterIn,
    RewardOut,
    UserOut,
)

User = get_user_model()
router = Router(tags=["users"])


@router.post(
    "/user/register",
    response={201: LoginTokenPairOut, 400: ErrorOut},
    summary="[Public] Register a user and obtain JWT tokens",
    throttle=AnonRateThrottle("5/h"),
)
def register(request, payload: RegisterIn):
    user = User(email=User.objects.normalize_email(payload.email), name=payload.name)
    try:
        user.full_clean(exclude=["password"])
        validate_password(payload.password, user=user)
        with transaction.atomic():
            user.set_password(payload.password)
            user.save()
    except ValidationError as exc:
        return Status(400, {"detail": " ".join(exc.messages)})
    except IntegrityError:
        return Status(400, {"detail": "A user with that email already exists."})

    refresh = RefreshToken.for_user(user)
    return Status(
        201,
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user,
        },
    )


@router.post(
    "/user/login",
    response={200: LoginTokenPairOut, 401: ErrorOut},
    summary="[Public] Log in and obtain JWT tokens",
)
def login(request, payload: LoginIn):
    user = authenticate(request, email=payload.email, password=payload.password)
    if user is None or not user.is_active:
        return Status(401, {"detail": "Invalid email or password."})
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user,
    }


@router.post(
    "/user/token/refresh",
    response={200: RefreshedAccessTokenOut, 401: ErrorOut},
    summary="[Public] Refresh an access token",
)
def refresh_access_token(request, payload: RefreshTokenIn):
    try:
        refresh = RefreshToken(payload.refresh)
    except TokenError:
        return Status(401, {"detail": "Token is invalid or expired."})
    return {"access": str(refresh.access_token)}


@router.post(
    "/user/password-reset/request",
    response={200: DetailOut},
    summary="[Public] Request a password reset email",
    throttle=AnonRateThrottle("5/h"),
)
def password_reset_request(request, payload: PasswordResetRequestIn):
    email = User.objects.normalize_email(payload.email)
    user = User.objects.filter(email=email, is_active=True).first()
    if user is not None:
        send_password_reset_email(user)
    return {"detail": "If an account exists for that email, a reset link has been sent."}


@router.post(
    "/user/password-reset/confirm",
    response={200: LoginTokenPairOut, 400: ErrorOut},
    summary="[Public] Confirm a password reset with uid and token",
    throttle=AnonRateThrottle("10/h"),
)
def password_reset_confirm(request, payload: PasswordResetConfirmIn):
    try:
        user_id = force_str(urlsafe_base64_decode(payload.uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except User.DoesNotExist, ValueError, TypeError, OverflowError:
        return Status[dict[str, str]](400, {"detail": "Invalid or expired reset link."})

    if not default_token_generator.check_token(user, payload.token):
        return Status(400, {"detail": "Invalid or expired reset link."})

    try:
        validate_password(payload.password, user=user)
    except ValidationError as exc:
        return Status(400, {"detail": " ".join(exc.messages)})

    user.set_password(payload.password)
    user.save(update_fields=["password"])

    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user,
    }


@router.get(
    "/user/profile",
    auth=jwt_auth,
    response=UserOut,
    summary="[Public] Get the current user profile",
)
def profile(request):
    return request.auth


@router.get(
    "/user/rewards/list",
    auth=jwt_auth,
    response=list[RewardOut],
    summary="[Public] List the current user's rewards",
)
def rewards(request):
    return request.auth.rewards.all()


@router.post(
    "/level-results",
    auth=jwt_auth,
    response={201: LevelResultCreateOut, 404: ErrorOut},
    summary="[Public] Record a completed level",
)
def create_level_result(request, payload: LevelResultIn):
    try:
        level = Level.objects.get(pk=payload.level)
    except Level.DoesNotExist:
        return Status(404, {"detail": "Level not found."})

    result = LevelResult.objects.create(
        user=request.auth,
        level=level,
        star=payload.star,
        score=payload.score,
        correct=payload.correct,
        mistake=payload.mistake,
    )
    return Status(201, result)


@router.get(
    "/level-results/list",
    auth=jwt_auth,
    response=list[LevelResultOut],
    summary="[Public] List the current user's level results",
)
def list_level_results(request):
    return request.auth.level_results.all()
