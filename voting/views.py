from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Election, Candidate, Vote
from .serializers import ElectionSerializer, ElectionListSerializer, VoteSerializer
import hashlib
from .utils.encryption import encrypt_vote, decrypt_vote


# ─────────────────────────────────────────────
# FRONTEND VIEWS
# ─────────────────────────────────────────────

def home(request):
    """Landing page — list all elections with their status."""
    now = timezone.now()
    elections = Election.objects.prefetch_related('candidates', 'votes').all()

    active = [e for e in elections if e.status == 'active']
    upcoming = [e for e in elections if e.status == 'upcoming']
    ended = [e for e in elections if e.status == 'ended']

    # Which elections has the logged-in user voted in?
    voted_election_ids = set()
    if request.user.is_authenticated:
        voted_election_ids = set(
            Vote.objects.filter(voter=request.user).values_list('election_id', flat=True)
        )

    return render(request, 'voting/home.html', {
        'active_elections': active,
        'upcoming_elections': upcoming,
        'ended_elections': ended,
        'voted_election_ids': voted_election_ids,
    })


@login_required
def election_detail(request, election_id):
    """Single election page with voting form and live results."""
    election = get_object_or_404(Election, id=election_id)
    candidates = election.candidates.all()

    user_vote = None
    if request.user.is_authenticated:
        user_vote = Vote.objects.filter(voter=request.user, election=election).first()

    return render(request, 'voting/election_detail.html', {
        'election': election,
        'candidates': candidates,
        'user_vote': user_vote,
    })


@login_required

def hash_identity(identity):
    return hashlib.sha256(identity.encode()).hexdigest()

def cast_vote(request, election_id):
    """Handle vote form submission from the frontend."""

    if request.method != "POST":
        return redirect('election_detail', election_id=election_id)

    election = get_object_or_404(Election, id=election_id)

    # 🚫 Election must be active
    if not election.is_active:
        messages.error(request, f"This election is {election.status}. Voting is not allowed.")
        return redirect('election_detail', election_id=election_id)

    # 🧾 Get ID (Aadhaar/College ID)
    identity = request.POST.get("aadhaar")

    if not identity:
        messages.error(request, "ID is required")
        return redirect('election_detail', election_id=election_id)

    # 🔐 Hash identity
    voter_hash = hash_identity(identity)

    # 🚫 Prevent duplicate voting
    if Vote.objects.filter(election=election, voter_hash=voter_hash).exists():
        messages.error(request, "You have already voted with this ID")
        return redirect('election_detail', election_id=election_id)

    # 🗳 Get candidate
    candidate_id = request.POST.get("candidate_id")
    if not candidate_id:
        messages.error(request, "Please select a candidate")
        return redirect('election_detail', election_id=election_id)

    candidate = get_object_or_404(Candidate, id=candidate_id, election=election)

    # 🌐 Get IP
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    if ',' in ip:
        ip = ip.split(',')[0].strip()

    # 🔐 Encrypt vote
    encrypted = encrypt_vote(candidate.id)

    # 💾 Save vote
    Vote.objects.create(
        election=election,
        encrypted_vote=encrypted,
        voter_hash=voter_hash,
        voter_ip=ip
    )

    messages.success(request, "Your vote has been securely recorded!")
    return redirect('election_detail', election_id=election_id))


def results_view(request, election_id):
    election = get_object_or_404(Election, id=election_id)

    # 🚫 BLOCK RESULTS
    if election.status != 'ended':
        return render(request, 'voting/results.html', {
            'election': election,
            'candidates': [],
            'message': "Results are locked until election ends"
        })

    votes = election.votes.all()
    vote_count = {}

    for vote in votes:
        candidate_id = decrypt_vote(vote.encrypted_vote)
        vote_count[candidate_id] = vote_count.get(candidate_id, 0) + 1

    candidates = election.candidates.all()

    for c in candidates:
        c.decrypted_votes = vote_count.get(c.id, 0)

    return render(request, 'voting/results.html', {
        'election': election,
        'candidates': candidates
    })


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect(request.GET.get('next', 'home'))
        else:
            messages.error(request, "Invalid username or password.")
    return render(request, 'voting/login.html')


def register_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        password2 = request.POST.get('password2')
        if password != password2:
            messages.error(request, "Passwords do not match.")
        elif User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken.")
        else:
            user = User.objects.create_user(username=username, password=password)
            login(request, user)
            messages.success(request, f"Welcome to ChainVote, {username}!")
            return redirect('home')
    return render(request, 'voting/register.html')


def logout_view(request):
    logout(request)
    return redirect('login')


# ─────────────────────────────────────────────
# REST API VIEWS
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def api_election_list(request):
    """
    GET /api/elections/
    Returns all elections with status, total votes (no candidate detail).
    """
    elections = Election.objects.prefetch_related('candidates', 'votes').all()
    serializer = ElectionListSerializer(elections, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_election_detail(request, election_id):
    """
    GET /api/elections/<id>/
    Returns full election detail including candidates and vote counts.
    """
    election = get_object_or_404(Election, id=election_id)
    serializer = ElectionSerializer(election)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_cast_vote(request, election_id):
    """
    POST /api/elections/<id>/vote/
    Body: { "candidate_id": <int> }

    All business rules enforced here on the backend:
    1. Election must be active
    2. Candidate must belong to this election
    3. User must not have voted before
    """
    election = get_object_or_404(Election, id=election_id)

    # Rule 1: Active election check
    if not election.is_active:
        return Response(
            {'error': f'Election is {election.status}. Voting is not open.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Rule 2: Double vote check
    if Vote.objects.filter(voter=request.user, election=election).exists():
        return Response(
            {'error': 'You have already voted in this election.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = VoteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    candidate_id = serializer.validated_data['candidate_id']

    # Rule 3: Candidate must belong to this election
    candidate = Candidate.objects.filter(id=candidate_id, election=election).first()
    if not candidate:
        return Response(
            {'error': 'Candidate does not belong to this election.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get IP
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    if ',' in ip:
        ip = ip.split(',')[0].strip()

    vote = Vote.objects.create(
        voter=request.user,
        election=election,
        candidate=candidate,
        voter_ip=ip,
    )

    return Response({
        'message': f'Vote cast successfully for {candidate.name}.',
        'voted_at': vote.voted_at,
        'candidate': candidate.name,
        'election': election.title,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_results(request, election_id):
    """
    GET /api/elections/<id>/results/
    Returns vote breakdown per candidate.
    """
    election = get_object_or_404(Election, id=election_id)
    candidates = election.candidates.prefetch_related('votes').all()

    results = []
    for c in candidates:
        results.append({
            'candidate_id': c.id,
            'name': c.name,
            'vote_count': c.vote_count,
            'vote_percentage': c.vote_percentage,
        })

    results.sort(key=lambda x: x['vote_count'], reverse=True)

    return Response({
        'election_id': election.id,
        'election_title': election.title,
        'status': election.status,
        'total_votes': election.total_votes,
        'results': results,
    })

