from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse, VerifyEmailRequest,
    ResendVerificationRequest, DeleteAccountRequest, MessageResponse,
    PasswordResetRequest, PasswordResetConfirmRequest, UsageResponse,
)
from app.services.auth_service import (
    register_user, login_user, get_current_user, create_verification_token,
    verify_email, resend_verification, delete_account, request_password_reset,
    reset_password,
)
from app.services.email_service import send_password_reset_email, send_verification_email
from app.core.config import settings
from app.services.rate_limit_service import chat_usage, check_auth_request

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@router.post("/register", response_model=MessageResponse, status_code=201)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_auth_request(request.client.host if request.client else "unknown", "register")
    user = register_user(db, data)
    if settings.EMAIL_VERIFICATION_REQUIRED:
        token = create_verification_token(db, user)
        send_verification_email(user.email, token)
        return MessageResponse(message="Check your email to verify your account before signing in.")
    return MessageResponse(message="Account created. You can now sign in.")


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    check_auth_request(request.client.host if request.client else "unknown", "login")
    token = login_user(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.post("/verify-email", response_model=MessageResponse)
def verify_email_address(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    verify_email(db, data.token)
    return MessageResponse(message="Email verified. You can now sign in.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification_email(data: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)):
    check_auth_request(request.client.host if request.client else "unknown", "resend-verification")
    user, token = resend_verification(db, str(data.email))
    if user and token:
        send_verification_email(user.email, token)
    return MessageResponse(message="If that account needs verification, a new email has been sent.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    check_auth_request(request.client.host if request.client else "unknown", "forgot-password")
    user, token = request_password_reset(db, str(data.email))
    if user and token:
        # Never disclose whether the account exists. Delivery errors are logged
        # by the mail service and surfaced to the operator, not to an attacker.
        try:
            send_password_reset_email(user.email, token)
        except HTTPException:
            pass
    return MessageResponse(message="If an account exists for that email, a password-reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_endpoint(data: PasswordResetConfirmRequest, request: Request, db: Session = Depends(get_db)):
    check_auth_request(request.client.host if request.client else "unknown", "reset-password")
    reset_password(db, data.token, data.password)
    return MessageResponse(message="Password reset. You can now sign in.")


@router.get("/me", response_model=UserResponse)
def me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


@router.get("/usage", response_model=UsageResponse)
def usage(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, credentials.credentials)
    return {
        **chat_usage(user.id),
        "chat_requests_per_minute_limit": settings.CHAT_REQUESTS_PER_MINUTE,
        "chat_requests_per_day_limit": settings.CHAT_REQUESTS_PER_DAY,
    }


@router.delete("/me", status_code=204)
def remove_account(
    data: DeleteAccountRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, credentials.credentials)
    delete_account(db, user, data.password)
    return Response(status_code=204)
