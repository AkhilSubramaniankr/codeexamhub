import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, get_redis
from models import User
from schemas import EmailLoginRequest, VerifyTokenRequest, TokenResponse, UserResponse
from auth_utils import create_access_token, get_current_user
from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/magic-link")
async def request_magic_link(
    req: EmailLoginRequest, 
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    # Normalize email
    email = req.email.strip().lower()
    
    # 1. Verify user exists in database
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not registered for any exam."
        )
        
    # 2. Generate a secure token
    login_token = str(uuid.uuid4())
    
    # 3. Save to Redis with 15 minutes expiration
    redis_key = f"magic_token:{login_token}"
    await redis.setex(redis_key, timedelta(minutes=15), email)
    
    # 4. Generate the login link
    magic_link = f"{settings.FRONTEND_URL}/auth/callback?token={login_token}"
    
    # 5. In development, print to console. In production, we'd send an email.
    print("\n" + "="*80)
    print(f" MAGIC LINK GENERATED FOR {email}")
    print(f" Click the link below to login:")
    print(f" {magic_link}")
    print("="*80 + "\n")
    
    return {"message": "Magic link generated. Check console logs to login."}

@router.post("/verify", response_model=TokenResponse)
async def verify_magic_link(
    req: VerifyTokenRequest,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    redis_key = f"magic_token:{req.token}"
    email = await redis.get(redis_key)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired magic link token."
        )
        
    # Delete token from Redis to prevent re-use
    await redis.delete(redis_key)
    
    # Fetch user details
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    # Issue JWT Token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
