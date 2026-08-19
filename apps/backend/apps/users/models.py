from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import AuditingMixin, Layer
from apps.users.managers import UserManager


class RewardType(models.TextChoices):
    LEVEL_COMPLETION_BADGE = "level_completion_badge", "Level completion badge"
    LEVEL_THREE_STARS_BADGE = "level_three_stars_badge", "Level three stars badge"
    LEVEL_PERFECT_BADGE = "level_perfect_badge", "Level perfect badge"
    LAYER_THREE_CONSECUTIVE_THREE_STARS_TROPHY = (
        "three_consecutive_three_stars_trophy",
        "Three consecutive three stars trophy",
    )


class RewardImage(AuditingMixin, models.Model):
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to="rewards/")

    class Meta:
        db_table = "reward_images"

    def __str__(self) -> str:
        return self.name


class Reward(AuditingMixin, models.Model):
    type = models.CharField(max_length=255, choices=RewardType.choices)
    layer = models.CharField(max_length=20, choices=Layer.choices)

    # Only for level rewards
    level = models.ForeignKey(
        "game.Level",
        on_delete=models.CASCADE,
        related_name="rewards",
        null=True,
        blank=True,
    )

    image = models.ForeignKey(
        RewardImage,
        on_delete=models.PROTECT,
        related_name="rewards",
    )

    class Meta:
        db_table = "rewards"
        constraints = [
            # One level cannot have multiple rewards of the same type
            models.UniqueConstraint(
                fields=["type", "level"],
                condition=Q(level__isnull=False),
                name="unique_reward_type_level",
            ),
            # If level is null, this is a trophy reward for a layer
            # One layer cannot have multiple rewards of the same type
            models.UniqueConstraint(
                fields=["type", "layer"],
                condition=Q(level__isnull=True),
                name="unique_reward_type_layer",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.type} - {self.layer} - {self.level}"


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    rewards = models.ManyToManyField(
        Reward,
        through="UserReward",
        through_fields=("user", "reward"),
        related_name="users",
        blank=True,
    )

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_cheat = models.BooleanField(
        "cheat",
        default=False,
        help_text="Unlocks every published level for this user, skipping normal progression.",
    )
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"

    def __str__(self) -> str:
        return self.email


class UserReward(AuditingMixin, models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reward_links")
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name="user_links")

    class Meta:
        db_table = "users_to_rewards"
        constraints = [
            models.UniqueConstraint(fields=["user", "reward"], name="unique_user_reward")
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.reward}"


class LevelResult(AuditingMixin, models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="level_results")
    level = models.ForeignKey(
        "game.Level",
        on_delete=models.CASCADE,
        related_name="results",
    )
    star = models.PositiveSmallIntegerField()
    score = models.PositiveIntegerField()
    correct = models.PositiveIntegerField()
    mistake = models.PositiveIntegerField()

    class Meta:
        db_table = "level_results"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(star__gte=0, star__lte=3),
                name="level_result_star_between_0_and_3",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} - {self.level} ({self.score})"
