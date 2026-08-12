from rest_framework import serializers
from .models import Webhook


class WebhookSerializer(serializers.ModelSerializer):
    owner_username = serializers.SerializerMethodField(read_only=True)
    # Expose `secret` as write-only so it's never returned in GET responses
    secret = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default='',
        style={'input_type': 'password'},
    )
    # Synthetic bool: does this webhook have a signing secret configured?
    signed = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Webhook
        fields = [
            'id', 'name', 'url', 'events', 'status',
            'secret', 'signed', 'retries',
            'owner', 'owner_username', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'owner_username', 'signed', 'created_at', 'updated_at']

    def get_owner_username(self, obj):
        return obj.owner.username if obj.owner else None

    def get_signed(self, obj):
        return bool(obj.secret)

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['owner'] = request.user
        return super().create(validated_data)
