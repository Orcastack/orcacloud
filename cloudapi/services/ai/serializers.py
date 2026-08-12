from rest_framework import serializers
from .models import AnomalyDetectionRule, AnomalyEvent, ScalingPrediction, AIRecommendation


class AnomalyDetectionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyDetectionRule
        fields = '__all__'
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class AnomalyEventSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)

    class Meta:
        model = AnomalyEvent
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'rule_name']


class ScalingPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScalingPrediction
        fields = '__all__'
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class AIRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRecommendation
        fields = '__all__'
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
