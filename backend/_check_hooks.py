"""One-off script to check webhook configuration on monitored repos."""
import asyncio
from dotenv import load_dotenv
load_dotenv()

from db.database import AsyncSessionLocal
from sqlalchemy import select
from db.models import Repository, User

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Repository).where(Repository.is_monitored == True))
        repo = result.scalar_one_or_none()
        if not repo:
            print("No monitored repo")
            return
        print(f"Monitored repo: {repo.full_name} (id={repo.id})")

        user_result = await db.execute(select(User).where(User.id == repo.user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.access_token:
            print("No user token")
            return

        from github import Github
        g = Github(user.access_token)
        gh_repo = g.get_repo(repo.full_name)
        hooks = list(gh_repo.get_hooks())
        for h in hooks:
            url = h.config.get("url", "")
            print(f"  Hook {h.id}: url={url}")
            print(f"    events={h.events} active={h.active}")
        if not hooks:
            print("  No hooks found")

asyncio.run(check())
