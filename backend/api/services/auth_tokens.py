import hashlib
import secrets

from django.conf import settings
from django.utils import timezone
from rest_framework import exceptions

from users.models import SessionToken


def hash_token(raw_token):
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()


def generate_raw_token():
    return secrets.token_urlsafe(32)


def _create_token(user, token_type, lifetime_seconds):
    raw_token = generate_raw_token()
    token = SessionToken.objects.create(
        user=user,
        token_hash=hash_token(raw_token),
        token_type=token_type,
        expires_at=timezone.now() + timezone.timedelta(seconds=lifetime_seconds),
    )
    return raw_token, token


def issue_token_pair(user):
    raw_access_token, access_token = _create_token(
        user,
        SessionToken.ACCESS,
        settings.AUTH_ACCESS_TOKEN_LIFETIME_SECONDS,
    )
    raw_refresh_token, refresh_token = _create_token(
        user,
        SessionToken.REFRESH,
        settings.AUTH_REFRESH_TOKEN_LIFETIME_SECONDS,
    )
    return {
        'access_token': raw_access_token,
        'access_expires_at': access_token.expires_at,
        'refresh_token': raw_refresh_token,
        'refresh_expires_at': refresh_token.expires_at,
    }


def get_token_record(raw_token, token_type):
    if not raw_token:
        return None

    return SessionToken.objects.select_related('user').filter(
        token_hash=hash_token(raw_token),
        token_type=token_type,
    ).first()


def validate_access_token(raw_token, *, allow_expired=False, grace_seconds=0):
    token = get_token_record(raw_token, SessionToken.ACCESS)
    if not token:
        raise exceptions.AuthenticationFailed('Access token не найден.')

    if token.revoked_at:
        raise exceptions.AuthenticationFailed('Access token отозван.')

    now = timezone.now()
    if token.expires_at <= now and not allow_expired:
        raise exceptions.AuthenticationFailed('Access token истёк.')

    if allow_expired and token.expires_at + timezone.timedelta(seconds=grace_seconds) <= now:
        raise exceptions.AuthenticationFailed('Access token слишком старый для обновления.')

    token.last_used_at = now
    token.save(update_fields=['last_used_at'])
    return token


def validate_refresh_token(raw_token):
    token = get_token_record(raw_token, SessionToken.REFRESH)
    if not token:
        raise exceptions.AuthenticationFailed('Refresh token не найден.')

    if token.revoked_at:
        raise exceptions.AuthenticationFailed('Refresh token отозван.')

    if token.expires_at <= timezone.now():
        raise exceptions.AuthenticationFailed('Refresh token истёк.')

    token.last_used_at = timezone.now()
    token.save(update_fields=['last_used_at'])
    return token


def revoke_token(token):
    if token and not token.revoked_at:
        token.revoked_at = timezone.now()
        token.save(update_fields=['revoked_at'])


def revoke_token_by_raw_value(raw_token, token_type):
    token = get_token_record(raw_token, token_type)
    if token:
        revoke_token(token)


def build_refresh_cookie_kwargs(expires_at):
    return {
        'httponly': True,
        'secure': settings.AUTH_REFRESH_COOKIE_SECURE,
        'samesite': settings.AUTH_REFRESH_COOKIE_SAMESITE,
        'path': settings.AUTH_REFRESH_COOKIE_PATH,
        'expires': expires_at,
    }


def set_refresh_cookie(response, raw_refresh_token, expires_at):
    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        raw_refresh_token,
        **build_refresh_cookie_kwargs(expires_at),
    )
    return response


def clear_refresh_cookie(response):
    response.delete_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
    )
    return response


def refresh_access_token(csrf_access_token, raw_refresh_token):
    refresh_token = validate_refresh_token(raw_refresh_token)
    access_token = validate_access_token(
        csrf_access_token,
        allow_expired=True,
        grace_seconds=settings.AUTH_REFRESH_TOKEN_LIFETIME_SECONDS,
    )

    if access_token.user_id != refresh_token.user_id:
        raise exceptions.AuthenticationFailed('CSRF token и refresh token принадлежат разным пользователям.')

    revoke_token(refresh_token)
    revoke_token(access_token)

    return issue_token_pair(refresh_token.user)
