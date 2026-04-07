"""Check recent webhook deliveries for the monitored repo."""
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

        user_result = await db.execute(select(User).where(User.id == repo.user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.access_token:
            print("No user token")
            return

        import httpx
        # Use GitHub REST API to check hook deliveries
        headers = {
            "Authorization": f"token {user.access_token}",
            "Accept": "application/vnd.github+json",
        }
        hook_id = repo.webhook_id
        url = f"https://api.github.com/repos/{repo.full_name}/hooks/{hook_id}/deliveries"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=headers, params={"per_page": 10})
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                deliveries = r.json()
                for d in deliveries[:10]:
                    guid = d.get("guid", "")
                    event = d.get("event", "")
                    action = d.get("action", "")
                    status_code = d.get("status_code", "")
                    delivered_at = d.get("delivered_at", "")
                    status = d.get("status", "")
                    print(f"  {delivered_at} | {event}/{action} | HTTP {status_code} | {status} | {guid}")
            else:
                print(r.text[:500])

asyncio.run(check())
