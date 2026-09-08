from fastapi import Depends, status, HTTPException, APIRouter, Query
from sqlalchemy import or_
from model.schemas.account import UserDetails, AllUsers
from database.postgres.database import get_db
from sqlalchemy.orm import Session
from database.postgres import models
from services import oauth2

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", status_code=status.HTTP_200_OK)
async def get_users(
    query: str | None = Query(None, min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_admin: models.Admin = Depends(oauth2.get_current_admin),
):
    if current_admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized to perform action",
        )

    users_query = db.query(models.User)
    if query:
        term = f"%{query.strip()}%"
        users_query = users_query.filter(
            or_(
                models.User.business_name.ilike(term),
                models.User.email.ilike(term),
            )
        )
    return users_query.order_by(models.User.business_name.asc()).all()


# for users to see their account details
@router.get("/profile", status_code=status.HTTP_200_OK)
async def get_user(current_user: models.User = Depends(oauth2.get_current_user)):
    # search user
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return {"user": current_user, "tickets": current_user.incidents}


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_one_user(
    id: int,
    db: Session = Depends(get_db),
    current_admin: models.Admin = Depends(oauth2.get_current_admin),
):
    user = db.query(models.User).filter(models.User.id == id).first()

    if not current_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this profile",
        )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return {
        "user": user,
        "tickets": user.incidents if user.incidents is not None else [],
    }
