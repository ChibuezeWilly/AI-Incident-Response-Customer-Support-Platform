from fastapi import Depends, status, HTTPException, APIRouter, Response
from model.schemas.account import Login, LoginResponse
from database.postgres.database import get_db
from sqlalchemy.orm import Session
from services.utils import verify
from database.postgres import models
from services.oauth2 import create_access_token
from model.schemas.account import CreateAccount, AccountCreated
from services.utils import hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])
# return respons model


@router.post(
    "/signup", status_code=status.HTTP_201_CREATED, response_model=AccountCreated
)
async def create_user(user: CreateAccount, db: Session = Depends(get_db)):
    # check if email already exist
    email_exist = db.query(models.User).filter(models.User.email == user.email).first()
    if email_exist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An account with this email address already exists.",
        )
    # hash password and create instance of user
    first_password = user.password
    hashed_password = hash_password(first_password)
    new_user = user
    new_user.password = hashed_password

    # add password migrationnwith alembic
    try:
        new_user = models.User(**new_user.model_dump())
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected database error occurred while creating your account"
        )


@router.post("/login", response_model=LoginResponse)
async def login(user_details: Login, response: Response, db: Session = Depends(get_db)):
    # get user from database
    saved_user = (
        db.query(models.User).filter(models.User.email == user_details.email).first()
    )

    # raise exception if user not found
    if saved_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentails"
        )
    
    # verify password
    if verify(user_details.password, saved_user.password):
        # generate access_token
        access_token = create_access_token(data={"id": saved_user.id})
        
        return {
            "token": access_token,
            "token_type": "Bearer",
            "message": "Login successful",
            "user": saved_user,
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials"
        )

