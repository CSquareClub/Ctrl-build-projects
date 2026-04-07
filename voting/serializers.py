from rest_framework import serializers
from .models import Election, Candidate, Vote


class CandidateSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True)
    vote_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Candidate
        fields = ['id', 'name', 'description', 'vote_count', 'vote_percentage']


class ElectionSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)
    total_votes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Election
        fields = ['id', 'title', 'description', 'start_time', 'end_time',
                  'status', 'total_votes', 'candidates', 'created_at']


class ElectionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing elections (no candidates detail)."""
    status = serializers.CharField(read_only=True)
    total_votes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Election
        fields = ['id', 'title', 'description', 'start_time', 'end_time',
                  'status', 'total_votes', 'created_at']


class VoteSerializer(serializers.Serializer):
    """
    Used only for accepting vote input.
    We validate business logic in the view — serializer just handles input parsing.
    """
    candidate_id = serializers.IntegerField()

    def validate_candidate_id(self, value):
        if not Candidate.objects.filter(id=value).exists():
            raise serializers.ValidationError("Candidate not found.")
        return value
