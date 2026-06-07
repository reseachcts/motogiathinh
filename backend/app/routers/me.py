"""GET /api/me — returns the authenticated user + their permission map."""

from fastapi import APIRouter

from app.dependencies import DB, CurrentUser, load_permissions, resolve_branch_slug
from app.schemas.auth import WireUser

router = APIRouter(tags=["me"])


@router.get("/me")
async def me(current_user: CurrentUser, db: DB):
    branch_slug = await resolve_branch_slug(db, current_user)
    perms = await load_permissions(db, current_user)
    return {
        "user": WireUser.from_user(current_user, branch_id_override=branch_slug),
        "permissions": perms,
    }
