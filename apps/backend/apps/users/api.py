from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from ninja import Router, Status
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.exceptions import TokenError
from ninja_jwt.tokens import RefreshToken

from apps.game.models import Level
from apps.users.models import LevelResult
from apps.users.schemas import (
    ErrorOut,
    LevelResultIn,
    LevelResultOut,
    LoginIn,
    LoginTokenPairOut,
    RefreshedAccessTokenOut,
    RefreshTokenIn,
    RegisterIn,
    RewardOut,
    UserOut,
)

User = get_user_model()
router = Router(tags=["users"])
jwt_auth = JWTAuth()


@router.post(
    "/user/register",
    response={201: UserOut, 400: ErrorOut},
    summary="Register a user",
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
    return Status(201, user)


@router.post(
    "/user/login",
    response={200: LoginTokenPairOut, 401: ErrorOut},
    summary="Log in and obtain JWT tokens",
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
    summary="Refresh an access token",
)
def refresh_access_token(request, payload: RefreshTokenIn):
    try:
        refresh = RefreshToken(payload.refresh)
    except TokenError:
        return Status(401, {"detail": "Token is invalid or expired."})
    return {"access": str(refresh.access_token)}


@router.get(
    "/user/profile",
    auth=jwt_auth,
    response=UserOut,
    summary="Get the current user profile",
)
def profile(request):
    return request.auth


@router.get(
    "/user/rewards/list",
    auth=jwt_auth,
    response=list[RewardOut],
    summary="List the current user's rewards",
)
def rewards(request):
    return request.auth.rewards.all()


@router.post(
    "/level-results",
    auth=jwt_auth,
    response={201: LevelResultOut, 404: ErrorOut},
    summary="Record a completed level",
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
    summary="List the current user's level results",
)
def list_level_results(request):
    return request.auth.level_results.all()
