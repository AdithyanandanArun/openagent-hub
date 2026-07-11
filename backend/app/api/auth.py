from fastapi import APIRouter, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse, VerifyEmailRequest,
    ResendVerificationRequest, DeleteAccountRequest, MessageResponse,
)
from app.services.auth_service import (
    register_user, login_user, get_current_user, create_verification_token,
    verify_email, resend_verification, delete_account,
)
from app.services.email_service import send_verification_email
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@router.post("/register", response_model=MessageResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, data)
    if settings.EMAIL_VERIFICATION_REQUIRED:
        token = create_verification_token(db, user)
        send_verification_email(user.email, token)
        return MessageResponse(message="Check your email to verify your account before signing in.")
    return MessageResponse(message="Account created. You can now sign in.")


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.post("/verify-email", response_model=MessageResponse)
def verify_email_address(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    verify_email(db, data.token)
    return MessageResponse(message="Email verified. You can now sign in.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification_email(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    user, token = resend_verification(db, str(data.email))
    if user and token:
        send_verification_email(user.email, token)
    return MessageResponse(message="If that account needs verification, a new email has been sent.")


@router.get("/me", response_model=UserResponse)
def me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


@router.delete("/me", status_code=204)
def remove_account(
    data: DeleteAccountRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, credentials.credentials)
    delete_account(db, user, data.password)
    return Response(status_code=204)
