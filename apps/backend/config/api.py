from ninja import NinjaAPI

from apps.game.api import router as game_router
from apps.users.api import router as users_router

api = NinjaAPI(title="UTG API", version="1.0.0", urls_namespace="utg-api")
api.add_router("", users_router)
api.add_router("", game_router)


@api.get("/health", tags=["system"], summary="Health check")
def health(request):
    return {"status": "ok"}
