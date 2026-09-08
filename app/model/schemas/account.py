from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any
from model.schemas.schema import TicketContext, BaseResponse

class AdminBase(BaseModel):
    name: str = Field(
        ..., 
        description="The full legal name of the system administrator."
    )
    email: EmailStr = Field(
        ..., 
        description="The unique, verified institutional email address of the administrator."
    )


class AdminCreate(AdminBase):
    password: str = Field(
        ..., 
        description="The plain-text raw password chosen by the admin, hashed before database storage."
    )


class AdminResponse(AdminBase):
    id: int = Field(
        ..., 
        description="The unique auto-incrementing integer identifier assigned by the database backend."
    )
    role: str = Field(
        ..., 
        description="The RBAC authorization group assigned to the admin (e.g., 'superadmin', 'moderator')."
    )

    class Config:
        from_attributes = True


class AdminLoginResponse(BaseModel):
    token: str = Field(
        ..., 
        description="The cryptographically signed JWT bearer token used to authenticate subsequent REST API endpoints."
    )
    token_type: str = Field(
        "bearer", 
        description="The type of token being issued, standardizing validation protocols."
    )
    user: AdminResponse = Field(
        "user", 
        description="Admin's details"
    )


class TokenData(BaseModel):
    id: int | None = Field(
        None, 
        description="The decoupled database user ID extracted directly from the verified JWT payload claims."
    )


class AccountBase(BaseModel):
    business_name: str = Field(
        ..., 
        description="The registered commercial name of the business entity or client workspace."
    )
    email: EmailStr = Field(
        ..., 
        description="The primary corporate billing and contact email address associated with the account."
    )
    account_tier: str = Field(
        ..., 
        description="The active service entitlement plan of the account (e.g., 'Free', 'Premium', 'Enterprise')."
    )
    sla: int = Field(..., description="Service leval agreement between for each user")


class CreateAccount(AccountBase):
    password: str = Field(
        ..., 
        min_length=4, 
        max_length=72, 
        description="The account user's raw password string. Must be within the secure 4 to 72 character length boundaries."
    )


class AccountCreated(AccountBase):
    id: int = Field(
        ..., 
        description="The unique system-wide integer identifier assigned to this client account."
    )
    created_at: datetime = Field(
        ..., 
        description="The precise UTC timestamp confirming when the account record was committed to the database."
    )

    class Config:
        from_attributes = True


class AllUsers(AccountCreated):
    role: str = Field(
        "User",
        description="The structural system role assigned to the user entity, distinguishing users from administrators."
    )


class UserDetails(BaseModel):
    user: AccountCreated = Field(
        ..., 
        description="The foundational profile and credential metadata for the specific user."
    )
    tickets: list[BaseResponse] = Field(
        ..., 
        description="The comprehensive tracking list of support or operational tickets assigned to or created by this user."
    )

    class Config:
        from_attributes = True


class Login(BaseModel):
    email: EmailStr = Field(
        ..., 
        description="The registered email address used as the primary login credential identifier."
    )
    password: str = Field(
        ..., 
        description="The raw password string provided for login authentication matching."
    )


class LoginResponse(BaseModel):
    token: str = Field(
        ..., 
        description="The active JSON Web Token authorization string enabling validated session access."
    )
    token_type: str = Field(
        "bearer", 
        description="The token protocol standard, explicitly configured as 'bearer'."
    )
    user: AccountCreated = Field(
        ..., 
        description="The account metadata structure corresponding directly to the successfully authenticated user."
    )
