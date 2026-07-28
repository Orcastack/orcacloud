import base64
import hashlib
import hmac
import json
import time
from typing import Any

from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed


ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 15
REFRESH_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7
ALGORITHM = 'HS256'


class JWTAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth or auth[0].decode().lower() != self.keyword.lower():
            return None
        if len(auth) != 2:
            raise AuthenticationFailed('Invalid Authorization header format.')

        token = auth[1].decode()
        payload = decode_token(token, expected_type='access')
        try:
            user = User.objects.get(pk=payload['sub'], is_active=True)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed('User not found.') from exc
        return user, payload

    def authenticate_header(self, request):
        return self.keyword


def issue_tokens_for_user(user: User) -> dict[str, Any]:
    access_payload = build_payload(user, token_type='access', lifetime=ACCESS_TOKEN_LIFETIME_SECONDS)
    refresh_payload = build_payload(user, token_type='refresh', lifetime=REFRESH_TOKEN_LIFETIME_SECONDS)
    return {
        'access_token': encode_token(access_payload),
        'refresh_token': encode_token(refresh_payload),
        'token_type': 'Bearer',
        'expires_in': ACCESS_TOKEN_LIFETIME_SECONDS,
    }


def build_payload(user: User, token_type: str, lifetime: int) -> dict[str, Any]:
    now = int(time.time())
    return {
        'sub': str(user.pk),
        'username': user.username,
        'type': token_type,
        'iat': now,
        'exp': now + lifetime,
        'iss': 'orcacloud',
        'aud': 'orcacloud-api',
    }


def encode_token(payload: dict[str, Any]) -> str:
    header = {'alg': ALGORITHM, 'typ': 'JWT'}
    header_segment = _b64url_encode(json.dumps(header, separators=(',', ':')).encode())
    payload_segment = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode())
    signing_input = f'{header_segment}.{payload_segment}'.encode()
    signature = hmac.new(settings.SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    return f'{header_segment}.{payload_segment}.{_b64url_encode(signature)}'


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    try:
        header_segment, payload_segment, signature_segment = token.split('.')
    except ValueError as exc:
        raise AuthenticationFailed('Invalid token format.') from exc

    signing_input = f'{header_segment}.{payload_segment}'.encode()
    expected_signature = hmac.new(settings.SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    provided_signature = _b64url_decode(signature_segment)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise AuthenticationFailed('Invalid token signature.')

    payload = json.loads(_b64url_decode(payload_segment).decode())
    now = int(time.time())
    if payload.get('exp', 0) < now:
        raise AuthenticationFailed('Token has expired.')
    if expected_type and payload.get('type') != expected_type:
        raise AuthenticationFailed('Invalid token type.')
    return payload


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode()


def _b64url_decode(value: str) -> bytes:
    padding = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
