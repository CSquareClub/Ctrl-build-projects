import re

from services.ai import generate_readme as ai_generate


async def build_readme(repo_url: str, options: dict) -> dict:
    """
    Generate a README for the given GitHub repo URL.
    Returns { content: str, repoName: str }
    """
    # Parse owner/repo from URL or plain "owner/repo" string
    match = re.search(r"github\.com/([^/]+/[^/]+?)(?:\.git)?/?$", repo_url)
    if match:
        repo_name = match.group(1)
    elif "/" in repo_url and not repo_url.startswith("http"):
        repo_name = repo_url.strip("/")
    else:
        repo_name = repo_url

    description = f"The {repo_name} project."
    content = await ai_generate(repo_name, description, options)

    return {"content": content, "repoName": repo_name}
