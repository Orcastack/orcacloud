from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from services.core.jwt_auth import decode_token, issue_tokens_for_user


class TokenRefreshView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'refresh_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        payload = decode_token(refresh_token, expected_type='refresh')
        try:
            user = User.objects.get(pk=payload['sub'], is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = issue_tokens_for_user(user)
        return Response(tokens)