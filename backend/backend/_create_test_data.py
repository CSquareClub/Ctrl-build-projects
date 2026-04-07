"""
Create faulty/malicious test data on the monitored GitHub repo so the AI
moderation pipeline can catch them.

Creates:
  1. SPAM issue (should → BLOCK)
  2. Toxic / abusive issue (should → BLOCK or FLAG)
  3. Vague / unclear issue (should → FLAG)
  4. PR with hardcoded secrets in code (should → BLOCK)
  5. PR with SQL injection vulnerability (should → BLOCK)
  6. PR with mild quality concern (should → FLAG)
  7. Toxic comment on an issue (should → BLOCK)
  8. Commit with an exposed API key pushed directly (should → BLOCK)
"""

import asyncio
import base64
import time
import random
import string

from dotenv import load_dotenv
load_dotenv()

from db.database import AsyncSessionLocal
from sqlalchemy import select
from db.models import Repository, User


REPO = None
TOKEN = None


async def _get_credentials():
    global REPO, TOKEN
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Repository).where(Repository.is_monitored == True)
        )
        repo = result.scalars().first()
        if not repo:
            raise RuntimeError("No monitored repo found")
        REPO = repo.full_name

        user_result = await db.execute(select(User).where(User.id == repo.user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.access_token:
            raise RuntimeError("No user token")
        TOKEN = user.access_token


def _gh():
    """Return an authenticated PyGithub Github instance."""
    from github import Github, Auth
    return Github(auth=Auth.Token(TOKEN))


def _rand(n=5):
    return "".join(random.choices(string.ascii_lowercase, k=n))


# ── 1. Spam Issue ─────────────────────────────────────────────────────────────
def create_spam_issue(gh_repo):
    print("\n[1/8] Creating SPAM issue...")
    issue = gh_repo.create_issue(
        title="🔥🔥 FREE ROBUX GENERATOR 2026 NO SURVEY CLICK HERE 🔥🔥",
        body=(
            "## GET FREE ROBUX NOW!!!\n\n"
            "Click this link to get UNLIMITED FREE ROBUX: http://totallynotascam.example.com\n\n"
            "NO SURVEY NO HUMAN VERIFICATION\n\n"
            "Tags: free robux, free vbucks, free gift cards, crypto airdrop\n\n"
            "SHARE WITH YOUR FRIENDS AND GET 10X MORE!!!\n\n"
            "💰💰💰💰💰💰💰💰💰💰💰💰\n\n"
            "This is not related to the project AT ALL. Just pure spam."
        ),
    )
    print(f"   Created #{issue.number}: {issue.title}")
    print(f"   URL: {issue.html_url}")
    return issue


# ── 2. Toxic / Abusive Issue ─────────────────────────────────────────────────
def create_toxic_issue(gh_repo):
    print("\n[2/8] Creating TOXIC issue...")
    issue = gh_repo.create_issue(
        title="This project is absolute garbage and the maintainers are incompetent",
        body=(
            "I can't believe how terrible this codebase is. "
            "Whoever wrote this clearly has no idea what they're doing. "
            "The maintainers are lazy and never fix anything. "
            "This is the worst open-source project I've ever seen. "
            "You should all be ashamed of yourselves. "
            "Delete this repo and stop wasting everyone's time. "
            "I've seen better code from a first-week bootcamp student. "
            "Absolutely pathetic effort from everyone involved."
        ),
    )
    print(f"   Created #{issue.number}: {issue.title}")
    print(f"   URL: {issue.html_url}")
    return issue


# ── 3. Vague / Unclear Issue ─────────────────────────────────────────────────
def create_unclear_issue(gh_repo):
    print("\n[3/8] Creating UNCLEAR issue...")
    issue = gh_repo.create_issue(
        title="it doesnt work",
        body="help its broken. nothing works. fix please.",
    )
    print(f"   Created #{issue.number}: {issue.title}")
    print(f"   URL: {issue.html_url}")
    return issue


# ── Helper: create a branch, commit a file, open a PR ────────────────────────
def _create_pr(gh_repo, branch_name, file_path, file_content, commit_msg, pr_title, pr_body):
    """Create a branch, commit a file to it, and open a PR back to main/master."""
    default_branch = gh_repo.default_branch
    ref = gh_repo.get_git_ref(f"heads/{default_branch}")
    sha = ref.object.sha

    gh_repo.create_git_ref(f"refs/heads/{branch_name}", sha)
    gh_repo.create_file(
        path=file_path,
        message=commit_msg,
        content=file_content,
        branch=branch_name,
    )
    pr = gh_repo.create_pull(
        title=pr_title,
        body=pr_body,
        head=branch_name,
        base=default_branch,
    )
    return pr


# ── 4. PR with hardcoded secrets ─────────────────────────────────────────────
def create_secrets_pr(gh_repo):
    print("\n[4/8] Creating PR with HARDCODED SECRETS...")
    branch = f"test/leaked-secrets-{_rand()}"
    code = """\
import os
import boto3

# TODO: move to env vars later
AWS_ACCESS_KEY = "AKIA-FAKE-EXAMPLE-KEY-12345"
AWS_SECRET_KEY = "wJalrXUt-FAKE-SECRET-EXAMPLE/bPxRfi"
DATABASE_PASSWORD = "super_secret_production_password_123!"
PAYMENT_API_KEY = "pay_live_FAKE_4eC39HqLyjWDarjtT1zdp7dc"
INTERNAL_TOKEN = "ghp_FAKE_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

def connect_to_db():
    # SECURITY ISSUE: password hardcoded, not using environment variable
    return f"postgresql://admin:{DATABASE_PASSWORD}@prod-db.company.internal:5432/myapp"

def get_s3_client():
    # SECURITY ISSUE: credentials hardcoded in source code
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
    )

def charge_customer(amount):
    import requests
    # SECURITY ISSUE: API key embedded directly in source
    headers = {"Authorization": f"Bearer {PAYMENT_API_KEY}"}
    return requests.post("https://api.payment.example.com/charges",
                         json={"amount": amount}, headers=headers)
"""
    pr = _create_pr(
        gh_repo,
        branch_name=branch,
        file_path="config/credentials.py",
        file_content=code,
        commit_msg="Add database and AWS configuration",
        pr_title="feat: Add cloud service configuration",
        pr_body=(
            "This PR adds configuration for our cloud services including "
            "AWS S3, Stripe payments, and database connections.\n\n"
            "Ready for review!"
        ),
    )
    print(f"   Created PR #{pr.number}: {pr.title}")
    print(f"   URL: {pr.html_url}")
    return pr


# ── 5. PR with SQL injection vulnerability ───────────────────────────────────
def create_sqli_pr(gh_repo):
    print("\n[5/8] Creating PR with SQL INJECTION vulnerability...")
    branch = f"test/sqli-vuln-{_rand()}"
    code = """\
import sqlite3

def get_user(username):
    \"\"\"Fetch user from database by username.\"\"\"
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # Direct string interpolation — SQL INJECTION VULNERABILITY
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchone()

def delete_user(user_id):
    \"\"\"Delete a user by ID.\"\"\"
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = " + str(user_id))
    conn.commit()

def search_products(search_term):
    \"\"\"Search products — also vulnerable.\"\"\"
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE name LIKE '%" + search_term + "%'")
    return cursor.fetchall()

def login(username, password):
    \"\"\"Authentication — critically vulnerable to SQL injection.\"\"\"
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    if user:
        return {"authenticated": True, "user": user}
    return {"authenticated": False}
"""
    pr = _create_pr(
        gh_repo,
        branch_name=branch,
        file_path="app/database.py",
        file_content=code,
        commit_msg="Add user database operations",
        pr_title="feat: Add user management database layer",
        pr_body=(
            "Added database operations for user management:\n"
            "- Get user by username\n"
            "- Delete user\n"
            "- Search products\n"
            "- Login authentication\n\n"
            "All operations use SQLite for simplicity."
        ),
    )
    print(f"   Created PR #{pr.number}: {pr.title}")
    print(f"   URL: {pr.html_url}")
    return pr


# ── 6. PR with mild quality issues ───────────────────────────────────────────
def create_quality_pr(gh_repo):
    print("\n[6/8] Creating PR with QUALITY concerns...")
    branch = f"test/quality-issues-{_rand()}"
    code = """\
import os
import subprocess

def exec_command(cmd):
    # Runs arbitrary shell commands (mild concern)
    return subprocess.call(cmd, shell=True)

def process(data):
    # No input validation, bare except, prints to stdout
    try:
        eval(data)
    except:
        pass

def read_file(path):
    # Path traversal possible — no sanitisation
    with open(path, 'r') as f:
        return f.read()

DEBUG = True  # Left on in production code
ADMIN_PANEL_ENABLED = True  # Should be behind feature flag

def log_everything(request):
    print(f"User IP: {request.ip}")
    print(f"User cookies: {request.cookies}")
    print(f"Auth header: {request.headers.get('Authorization')}")
"""
    pr = _create_pr(
        gh_repo,
        branch_name=branch,
        file_path="utils/helpers.py",
        file_content=code,
        commit_msg="Add utility helpers",
        pr_title="chore: Add misc utility helpers",
        pr_body="Small utility functions we needed. Quick merge please!",
    )
    print(f"   Created PR #{pr.number}: {pr.title}")
    print(f"   URL: {pr.html_url}")
    return pr


# ── 7. Toxic comment on an existing issue ────────────────────────────────────
def create_toxic_comment(gh_repo, issue_number):
    print(f"\n[7/8] Creating TOXIC comment on issue #{issue_number}...")
    comment = gh_repo.get_issue(issue_number).create_comment(
        "This is the dumbest issue I've ever seen. The person who filed this "
        "clearly doesn't understand basic programming. Stop wasting maintainers' "
        "time with these idiotic reports. Go learn to code before opening issues. "
        "People like you are what's wrong with open source. Absolutely useless."
    )
    print(f"   Created comment: {comment.html_url}")
    return comment


# ── 8. Direct commit with exposed API key ────────────────────────────────────
def create_bad_commit(gh_repo):
    print("\n[8/8] Creating direct COMMIT with exposed API key...")
    default_branch = gh_repo.default_branch
    code = """\
# Environment configuration — DO NOT COMMIT THIS FILE
OPENAI_KEY = "sk-FAKE-abc123def456ghi789jkl012mno345pqr678stu901vwx234"
MAIL_API_KEY = "SG-FAKE-xxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyy"
TWILIO_TOKEN = "a1b2c3d4e5f6-FAKE-c3d4e5f6a1b2c3d4"
SLACK_TOKEN = "xoxb-FAKE-123456789012-xxxxxxxxxxxxxxxxxx"
JWT_SECRET = "my-jwt-secret-that-is-way-too-short"
ENCRYPTION_KEY = "supersecretkey123"
DB_CONNECTION = "postgresql://root:plaintext_password@db.prod.internal:5432/app"
"""
    result = gh_repo.create_file(
        path=f".env.production",
        message="Add production environment configuration",
        content=code,
        branch=default_branch,
    )
    sha = result["commit"].sha
    print(f"   Committed {sha[:7]} to {default_branch}")
    print(f"   URL: https://github.com/{REPO}/commit/{sha}")
    return result


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    await _get_credentials()
    print(f"Repo: {REPO}")
    print(f"Token: {TOKEN[:8]}...")
    print("=" * 60)

    g = _gh()
    gh_repo = g.get_repo(REPO)

    # Issues (3) — already created (#6, #7, #8), skip to avoid duplicates
    # spam_issue = create_spam_issue(gh_repo)
    # toxic_issue = create_toxic_issue(gh_repo)
    # unclear_issue = create_unclear_issue(gh_repo)
    print("\n[1-3/8] Issues #6, #7, #8 already created — skipping.")

    # We need the unclear issue reference for the toxic comment
    unclear_issue_number = 8

    # PRs (3)
    try:
        secrets_pr = create_secrets_pr(gh_repo)
        time.sleep(2)
    except Exception as e:
        print(f"   FAILED: {e}")

    try:
        sqli_pr = create_sqli_pr(gh_repo)
        time.sleep(2)
    except Exception as e:
        print(f"   FAILED: {e}")

    try:
        quality_pr = create_quality_pr(gh_repo)
        time.sleep(2)
    except Exception as e:
        print(f"   FAILED: {e}")

    # Toxic comment on the unclear issue
    try:
        create_toxic_comment(gh_repo, unclear_issue_number)
        time.sleep(2)
    except Exception as e:
        print(f"   FAILED: {e}")

    # Bad commit direct to main
    try:
        create_bad_commit(gh_repo)
    except Exception as e:
        print(f"   FAILED: {e}")

    print("\n" + "=" * 60)
    print("All 8 test items created!")
    print("Wait 30-60 seconds for webhooks to process, then check:")
    print("  - Moderation page in the frontend")
    print("  - GitHub issues/PRs for bot comments")
    print("  - Server logs for processing details")


if __name__ == "__main__":
    asyncio.run(main())
