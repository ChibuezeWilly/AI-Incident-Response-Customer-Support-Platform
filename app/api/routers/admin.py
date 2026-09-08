from fastapi import Depends, status, HTTPException, APIRouter
from ...model.schemas.account import AdminCreate, AdminResponse, Login, AdminLoginResponse
from ...database.postgres.database import get_db
from sqlalchemy.orm import Session
from ...services.utils import verify
from ...database.postgres import models
from ...services.oauth2 import create_access_token
from ...services.utils import hash_password

router = APIRouter(
    prefix="/admin/auth",
    tags=["Admin Authentication"]
)
# return respons model

@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=AdminResponse) 
async def create_user(user: AdminCreate, db: Session = Depends(get_db)):
    # check if email already exist
    email_exist = db.query(models.Admin).filter(models.Admin.email == user.email).first()
    if email_exist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
                detail="An account with this email address already exists."
            )   
    # hash password and create instance of user
    first_password = user.password
    hashed_password = hash_password(first_password)
    new_admin = user
    new_admin.password = hashed_password
    
    
    # add password migrationnwith alembic
    try:
        new_admin = models.Admin(**new_admin.model_dump())
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return new_admin
    
    except Exception as e:
        db.rollback()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected database error occurred while creating your account"
        )


@router.post("/login", response_model=AdminLoginResponse)
async def login(user_details: Login, db: Session = Depends(get_db)):
    # get user from database
    saved_user = db.query(models.Admin).filter(models.Admin.email == user_details.email).first()
    
    # raise exception if user not found
    if saved_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentails")
    
    # verify password
    if verify(user_details.password, saved_user.password):
        # generate access_token
        access_token = create_access_token(data={"id": saved_user.id})
        return {
            "token": access_token,
            "token_type": "bearer",
            "user": saved_user
        }
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials") 
    