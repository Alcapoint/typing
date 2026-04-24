from rest_framework import authentication, exceptions

from .services.auth_tokens import validate_access_token


class AccessTokenAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode('utf-8')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = validate_access_token(parts[1])
        return (token.user, token)
