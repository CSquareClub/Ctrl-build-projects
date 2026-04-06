import hashlib
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Election(models.Model):
    """
    Represents a single election event.
    Status is derived from start_time and end_time — no separate field needed.
    This keeps logic clean and avoids stale state bugs.
    """
    STATUS_UPCOMING = 'upcoming'
    STATUS_ACTIVE = 'active'
    STATUS_ENDED = 'ended'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return self.title

    @property
    def status(self):
        now = timezone.now()
        if now < self.start_time:
            return self.STATUS_UPCOMING
        elif now > self.end_time:
            return self.STATUS_ENDED
        else:
            return self.STATUS_ACTIVE

    @property
    def is_active(self):
        return self.status == self.STATUS_ACTIVE

    @property
    def total_votes(self):
        return self.votes.count()


class Candidate(models.Model):
    """
    A candidate belongs to exactly one election.
    Using ForeignKey with related_name='candidates' allows
    easy access: election.candidates.all()
    """
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name='candidates'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ['election', 'name']  # No duplicate names per election

    def __str__(self):
        return f"{self.name} ({self.election.title})"

    @property
    def vote_count(self):
        return self.votes.count()

    @property
    def vote_percentage(self):
        total = self.election.total_votes
        if total == 0:
            return 0
        return round((self.vote_count / total) * 100, 1)


class Vote(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='votes')

    encrypted_vote = models.CharField(max_length=255)

    voter_hash = models.CharField(max_length=64)

    voter_ip = models.GenericIPAddressField(null=True, blank=True)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['election', 'voter_hash']

    def __str__(self):
        return f"Encrypted vote in {self.election.title}"