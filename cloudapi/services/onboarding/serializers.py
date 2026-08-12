# OrcaCloud – Onboarding Serializers

from rest_framework import serializers
from .models import OnboardingProgress


class OnboardingProgressSerializer(serializers.ModelSerializer):
    completion_pct  = serializers.ReadOnlyField()
    completed_steps = serializers.ReadOnlyField()

    class Meta:
        model  = OnboardingProgress
        fields = [
            'id',
            'verify_email',
            'add_ssh_key',
            'create_vm',
            'configure_network',
            'attach_volume',
            'explore_dashboard',
            'completion_pct',
            'completed_steps',
            'updated_at',
        ]
        read_only_fields = ['id', 'completion_pct', 'completed_steps', 'updated_at']
