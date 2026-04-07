"""Open a test issue via the GitHub API on the monitored repo to verify the full pipeline."""
import asyncio
from dotenv import load_dotenv
load_dotenv()

from db.database import AsyncSessionLocal
from sqlalchemy import select
from db.models import Repository, User

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Repository).where(Repository.is_monitored == True))
        repo = result.scalar_one_or_none()
        if not repo:
            print("No monitored repo")
            return

        user_result = await db.execute(select(User).where(User.id == repo.user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.access_token:
            print("No user token")
            return

        from github import Github
        g = Github(user.access_token)
        gh_repo = g.get_repo(repo.full_name)
        issue = gh_repo.create_issue(
            title="[Test] Memory leak in database connection pool",
            body=(
                "## Bug Report\n\n"
                "There appears to be a memory leak in the database connection pool handler.\n\n"
                "### Steps to Reproduce\n"
                "1. Start the server with `uvicorn main:app`\n"
                "2. Send 1000 concurrent requests to `/api/data`\n"
                "3. Observe memory usage growing indefinitely\n\n"
                "### Expected Behavior\n"
                "Memory should be reclaimed after connections are returned to the pool.\n\n"
                "### Actual Behavior\n"
                "Memory grows from 150MB to 2GB over 10 minutes under load.\n\n"
                "### Environment\n"
                "- Python 3.11\n"
                "- SQLAlchemy 2.0\n"
                "- asyncpg 0.29"
            ),
        )
        print(f"Created issue #{issue.number}: {issue.title}")
        print(f"URL: {issue.html_url}")
        print("Webhook should fire now — check server logs!")

asyncio.run(main())
