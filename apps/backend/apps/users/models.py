from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import AuditingMixin
from apps.users.managers import UserManager


class Reward(AuditingMixin, models.Model):
    name = models.CharField(max_length=255)
    asset_path = models.CharField(max_length=255)

    class Meta:
        db_table = "rewards"

    def __str__(self) -> str:
        return self.name


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    total_score = models.PositiveIntegerField(default=0)
    total_stars = models.PositiveIntegerField(default=0)
    rewards = models.ManyToManyField(
        Reward,
        through="UserReward",
        through_fields=("user", "reward"),
        related_name="users",
        blank=True,
    )

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
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
