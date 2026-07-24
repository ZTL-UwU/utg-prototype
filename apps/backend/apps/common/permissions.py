from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

from ninja.errors import AuthorizationError

P = ParamSpec("P")
R = TypeVar("R")

# Note: must be placed after the @router.* decorator so the route registers the wrapped view.
def require_perm(
    *perms: str,
    message: str | None = None,
    any_of: bool = False,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    if not perms:
        raise ValueError("require_perm() needs at least one permission string")

    detail = message or "You do not have permission to perform this action."

    def decorator(view_func: Callable[P, R]) -> Callable[P, R]:
        @wraps(view_func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            request = args[0] if args else kwargs.get("request")
            user = getattr(request, "auth", None) if request is not None else None
            if user is None:
                raise AuthorizationError(message="Authentication required.")

            checks = (user.has_perm(perm) for perm in perms)
            allowed = any(checks) if any_of else all(checks)
            if not allowed:
                raise AuthorizationError(message=detail)
            return view_func(*args, **kwargs)

        return wrapper

    return decorator
