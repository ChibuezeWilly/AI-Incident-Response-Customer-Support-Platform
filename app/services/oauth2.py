from datetime import datetime, timedelta, timezone
import jwt 
from model.schemas.account import TokenData
from fastapi import Depends, status, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database.postgres.database import get_db
from sqlalchemy.orm import Session
from database.postgres import models
from database.postgres.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/auth/login')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM.upper())
    
    return encoded_jwt

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM.upper()])
        
        id: str = payload.get("id")
        if id is None:  
            raise credentials_exception
            
        token_data = TokenData(id=id)
    
    except jwt.PyJWTError: 
        raise credentials_exception
    
    return token_data
    
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Could not validate Credentials", 
        headers={"WWW-Authenticate": "Bearer"}
    )
    
    token_data = verify_access_token(token, credentials_exception)
    
    user = db.query(models.User).filter(models.User.id == token_data.id).first()
    return user

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Could not validate Credentials", 
        headers={"WWW-Authenticate": "bearer"}
    )
    
    token_data = verify_access_token(token, credentials_exception)
    
    user = db.query(models.Admin).filter(models.Admin.id == token_data.id).first()
    return user
