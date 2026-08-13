from pathlib import Path

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, ProtectedError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from ninja import File, Router, Status, UploadedFile
from ninja.throttling import AnonRateThrottle
from ninja_jwt.exceptions import TokenError
from ninja_jwt.tokens import RefreshToken

from apps.common.auth import jwt_auth
from apps.common.models import Layer
from apps.common.permissions import require_perm
from apps.game.models import Level
from apps.users.models import LevelResult, Reward, RewardImage, RewardType, UserReward
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
    RewardBulkIn,
    RewardBulkOut,
    RewardImageOut,
    RewardIn,
    RewardOut,
    RewardSimpleOut,
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
    return request.auth.rewards.select_related("image").all()


def _has_three_consecutive_three_stars(user, layer: str) -> bool:
    recent_stars = list(
        LevelResult.objects.filter(user=user, level__layer=layer)
        .order_by("-created_at", "-id")
        .values_list("star", flat=True)[:3]
    )
    return len(recent_stars) == 3 and all(star == 3 for star in recent_stars)


def _grant_level_result_rewards(user, result: LevelResult, level: Level) -> list[int]:
    types = [RewardType.LEVEL_COMPLETION_BADGE]
    if result.star == 3:
        types.append(RewardType.LEVEL_THREE_STARS_BADGE)
    if level.layer == Layer.TYPING and result.mistake == 0 and result.correct > 0:
        types.append(RewardType.LEVEL_PERFECT_BADGE)

    rewards = list(
        Reward.objects.filter(
            is_published=True,
            is_active=True,
            level=level,
            type__in=types,
        )
    )

    if result.star == 3 and _has_three_consecutive_three_stars(user, level.layer):
        trophy = Reward.objects.filter(
            is_published=True,
            is_active=True,
            type=RewardType.LAYER_THREE_CONSECUTIVE_THREE_STARS_TROPHY,
            layer=level.layer,
            level__isnull=True,
        ).first()
        if trophy is not None:
            rewards.append(trophy)

    if not rewards:
        return []

    owned_ids = set(
        UserReward.objects.filter(
            user=user, reward_id__in=[reward.id for reward in rewards]
        ).values_list("reward_id", flat=True)
    )
    new_rewards = [reward for reward in rewards if reward.id not in owned_ids]
    if not new_rewards:
        return []

    UserReward.objects.bulk_create(
        [UserReward(user=user, reward=reward) for reward in new_rewards],
        ignore_conflicts=True,
    )
    return [reward.id for reward in new_rewards]


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

    with transaction.atomic():
        result = LevelResult.objects.create(
            user=request.auth,
            level=level,
            star=payload.star,
            score=payload.score,
            correct=payload.correct,
            mistake=payload.mistake,
        )
        result.new_reward_ids = _grant_level_result_rewards(request.auth, result, level)

    return Status(201, result)


@router.get(
    "/level-results/list",
    auth=jwt_auth,
    response=list[LevelResultOut],
    summary="[Public] List the current user's level results",
)
def list_level_results(request):
    return request.auth.level_results.all()


@router.get(
    "/rewards/list-simple",
    response=list[RewardSimpleOut],
    summary="[Public] List published rewards (simple version)",
)
def list_rewards_simple(request):
    return Reward.objects.filter(is_active=True, is_published=True).select_related("image")


@router.get(
    "/rewards/list",
    auth=jwt_auth,
    response=list[RewardOut],
    summary="[Admin] List all rewards",
)
@require_perm("users.view_reward", message="You do not have permission to view rewards")
def list_rewards(request):
    return Reward.objects.select_related("image").all()


LEVEL_REWARD_TYPES = {
    RewardType.LEVEL_COMPLETION_BADGE,
    RewardType.LEVEL_THREE_STARS_BADGE,
    RewardType.LEVEL_PERFECT_BADGE,
}


def _reward_with_image(reward_id: int) -> Reward:
    return Reward.objects.select_related("image").get(id=reward_id)


def _reward_images_qs():
    return RewardImage.objects.annotate(reward_count=Count("rewards"))


def _reward_image_name_from_file(uploaded: UploadedFile) -> str:
    stem = Path(uploaded.name or "").stem.replace("-", " ").replace("_", " ").strip()
    return (stem or "Reward image")[:255]


def _reward_image_with_count(reward_image_id: int) -> RewardImage:
    return _reward_images_qs().get(id=reward_image_id)


def _apply_reward_payload(reward: Reward, payload: RewardIn) -> None:
    reward.type = payload.type
    reward.layer = payload.layer
    reward.level_id = payload.level
    reward.image_id = payload.image_id
    reward.is_published = payload.is_published


def _validate_reward_payload(payload: RewardIn):
    if payload.type not in RewardType.values:
        return Status(400, {"detail": "Unknown reward type."})
    if payload.layer not in Layer.values:
        return Status(400, {"detail": "Unknown layer."})

    is_level_type = payload.type in LEVEL_REWARD_TYPES
    if is_level_type and payload.level is None:
        return Status(400, {"detail": "Level is required for this reward type."})
    if not is_level_type and payload.level is not None:
        return Status(400, {"detail": "This reward type cannot be tied to a level."})

    if payload.level is not None:
        try:
            level = Level.objects.only("id", "layer").get(pk=payload.level)
        except Level.DoesNotExist:
            return Status(404, {"detail": "Level not found."})
        if level.layer != payload.layer:
            return Status(400, {"detail": "Reward layer must match the level layer."})

    if not RewardImage.objects.filter(pk=payload.image_id).exists():
        return Status(404, {"detail": "Reward image not found."})
    return None


def _reward_item_key(item: RewardIn) -> tuple:
    if item.level is not None:
        return ("level", item.type, item.level)
    return ("layer", item.type, item.layer)


def _validate_reward_bulk_items(items: list[RewardIn]):
    if not items:
        return None

    seen_keys: set[tuple] = set()
    level_ids: set[int] = set()
    image_ids: set[int] = set()

    for item in items:
        if item.type not in RewardType.values:
            return Status(400, {"detail": "Unknown reward type."})
        if item.layer not in Layer.values:
            return Status(400, {"detail": "Unknown layer."})

        is_level_type = item.type in LEVEL_REWARD_TYPES
        if is_level_type and item.level is None:
            return Status(400, {"detail": "Level is required for this reward type."})
        if not is_level_type and item.level is not None:
            return Status(400, {"detail": "This reward type cannot be tied to a level."})

        key = _reward_item_key(item)
        if key in seen_keys:
            return Status(400, {"detail": "Duplicate reward type for the same level or layer."})
        seen_keys.add(key)

        if item.level is not None:
            level_ids.add(item.level)
        image_ids.add(item.image_id)

    levels = {
        level.id: level for level in Level.objects.only("id", "layer").filter(pk__in=level_ids)
    }
    if len(levels) != len(level_ids):
        return Status(404, {"detail": "Level not found."})

    for item in items:
        if item.level is None:
            continue
        if levels[item.level].layer != item.layer:
            return Status(400, {"detail": "Reward layer must match the level layer."})

    existing_image_ids = set(
        RewardImage.objects.filter(pk__in=image_ids).values_list("id", flat=True)
    )
    if existing_image_ids != image_ids:
        return Status(404, {"detail": "Reward image not found."})
    return None


@router.post(
    "/reward-images",
    auth=jwt_auth,
    response={200: RewardImageOut, 400: ErrorOut, 403: ErrorOut},
    summary="[Admin] Create a reward image",
)
@require_perm("users.add_rewardimage", message="You do not have permission to create reward images")
def create_reward_image(
    request,
    image: File[UploadedFile] = None,
):
    if image is None:
        return Status(400, {"detail": "Image file is required."})
    reward_image = RewardImage.objects.create(
        name=_reward_image_name_from_file(image),
        image=image,
        is_published=True,
        created_by=request.auth,
        updated_by=request.auth,
    )
    return 200, _reward_image_with_count(reward_image.id)


@router.get(
    "/reward-images/list",
    auth=jwt_auth,
    response={200: list[RewardImageOut], 403: ErrorOut},
    summary="[Admin] List reward images",
)
@require_perm("users.view_rewardimage", message="You do not have permission to view reward images")
def list_reward_images(request):
    return _reward_images_qs().order_by("name", "id")


@router.get(
    "/reward-images/{reward_image_id}",
    auth=jwt_auth,
    response={200: RewardImageOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Get a reward image by ID",
)
@require_perm("users.view_rewardimage", message="You do not have permission to view reward images")
def get_reward_image(request, reward_image_id: int):
    try:
        return _reward_image_with_count(reward_image_id)
    except RewardImage.DoesNotExist:
        return Status(404, {"detail": "Reward image not found."})


@router.patch(
    "/reward-images/{reward_image_id}",
    auth=jwt_auth,
    response={200: RewardImageOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a reward image",
)
@require_perm(
    "users.change_rewardimage", message="You do not have permission to update reward images"
)
def update_reward_image(
    request,
    reward_image_id: int,
    image: File[UploadedFile] = None,
):
    try:
        reward_image = RewardImage.objects.get(id=reward_image_id)
    except RewardImage.DoesNotExist:
        return Status(404, {"detail": "Reward image not found."})

    reward_image.is_published = True
    if image is not None:
        if reward_image.image:
            reward_image.image.delete(save=False)
        reward_image.image = image
        reward_image.name = _reward_image_name_from_file(image)
    reward_image.updated_by = request.auth
    reward_image.save()
    return _reward_image_with_count(reward_image.id)


@router.delete(
    "/reward-images/{reward_image_id}",
    auth=jwt_auth,
    response={204: None, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a reward image",
)
@require_perm(
    "users.delete_rewardimage", message="You do not have permission to delete reward images"
)
def delete_reward_image(request, reward_image_id: int):
    try:
        reward_image = RewardImage.objects.get(id=reward_image_id)
    except RewardImage.DoesNotExist:
        return Status(404, {"detail": "Reward image not found."})
    try:
        reward_image.delete()
    except ProtectedError:
        return Status(
            400,
            {"detail": "Cannot delete this reward image because it is still used by rewards."},
        )
    return Status(204, None)


@router.post(
    "/rewards",
    auth=jwt_auth,
    response={200: RewardOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Create a reward",
)
@require_perm("users.add_reward", message="You do not have permission to create rewards")
def create_reward(request, payload: RewardIn):
    relation_error = _validate_reward_payload(payload)
    if relation_error:
        return relation_error

    reward = Reward(created_by=request.auth, updated_by=request.auth)
    _apply_reward_payload(reward, payload)
    try:
        with transaction.atomic():
            reward.save()
    except IntegrityError:
        return Status(
            400, {"detail": "A reward of this type already exists for this level or layer."}
        )
    return _reward_with_image(reward.id)


@router.post(
    "/rewards/bulk",
    auth=jwt_auth,
    response={200: RewardBulkOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Create or update rewards in bulk",
)
@require_perm(
    "users.add_reward",
    "users.change_reward",
    message="You do not have permission to create or update rewards",
)
def bulk_upsert_rewards(request, payload: RewardBulkIn):
    relation_error = _validate_reward_bulk_items(payload.items)
    if relation_error:
        return relation_error

    if not payload.items:
        return {"created": 0, "updated": 0, "skipped": 0, "rewards": []}

    level_ids = [item.level for item in payload.items if item.level is not None]
    types = {item.type for item in payload.items}
    layers = {item.layer for item in payload.items}

    existing_by_level: dict[tuple[str, int], Reward] = {}
    if level_ids:
        for reward in Reward.objects.filter(type__in=types, level_id__in=level_ids):
            existing_by_level[(reward.type, reward.level_id)] = reward

    existing_by_layer: dict[tuple[str, str], Reward] = {}
    for reward in Reward.objects.filter(type__in=types, layer__in=layers, level__isnull=True):
        existing_by_layer[(reward.type, reward.layer)] = reward

    created_ids: list[int] = []
    updated_ids: list[int] = []
    skipped = 0

    try:
        with transaction.atomic():
            for item in payload.items:
                if item.level is not None:
                    existing = existing_by_level.get((item.type, item.level))
                else:
                    existing = existing_by_layer.get((item.type, item.layer))

                if existing is None:
                    reward = Reward(created_by=request.auth, updated_by=request.auth)
                    _apply_reward_payload(reward, item)
                    reward.save()
                    created_ids.append(reward.id)
                    continue

                if payload.mode == "fill_missing":
                    skipped += 1
                    continue

                _apply_reward_payload(existing, item)
                existing.updated_by = request.auth
                existing.save()
                updated_ids.append(existing.id)
    except IntegrityError:
        return Status(
            400, {"detail": "A reward of this type already exists for this level or layer."}
        )

    result_ids = created_ids + updated_ids
    rewards = (
        list(Reward.objects.select_related("image").filter(id__in=result_ids)) if result_ids else []
    )
    rewards.sort(key=lambda reward: result_ids.index(reward.id))
    return {
        "created": len(created_ids),
        "updated": len(updated_ids),
        "skipped": skipped,
        "rewards": rewards,
    }


@router.get(
    "/rewards/{reward_id}",
    auth=jwt_auth,
    response={200: RewardOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Get a reward by ID",
)
@require_perm("users.view_reward", message="You do not have permission to view rewards")
def get_reward(request, reward_id: int):
    try:
        return _reward_with_image(reward_id)
    except Reward.DoesNotExist:
        return Status(404, {"detail": "Reward not found."})


@router.patch(
    "/rewards/{reward_id}",
    auth=jwt_auth,
    response={200: RewardOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Update a reward",
)
@require_perm("users.change_reward", message="You do not have permission to update rewards")
def update_reward(request, reward_id: int, payload: RewardIn):
    try:
        reward = _reward_with_image(reward_id)
    except Reward.DoesNotExist:
        return Status(404, {"detail": "Reward not found."})

    relation_error = _validate_reward_payload(payload)
    if relation_error:
        return relation_error

    _apply_reward_payload(reward, payload)
    reward.updated_by = request.auth
    try:
        with transaction.atomic():
            reward.save()
    except IntegrityError:
        return Status(
            400, {"detail": "A reward of this type already exists for this level or layer."}
        )
    return _reward_with_image(reward.id)


@router.delete(
    "/rewards/{reward_id}",
    auth=jwt_auth,
    response={204: None, 403: ErrorOut, 404: ErrorOut},
    summary="[Admin] Delete a reward",
)
@require_perm("users.delete_reward", message="You do not have permission to delete rewards")
def delete_reward(request, reward_id: int):
    deleted, _ = Reward.objects.filter(id=reward_id).delete()
    if not deleted:
        return Status(404, {"detail": "Reward not found."})
    return Status(204, None)
