#!/usr/bin/env python3
"""
OpenIssue CLI - Post issues to backend for triage and review.

Usage:
    python -m cli.post_issue post --title "Bug" --description "Details"
    python -m cli.post_issue post --interactive
    python -m cli.post_issue post --file issue.md
    python -m cli.post_issue flush-queue
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List

try:
    import typer
    from typer import Typer, Option, Argument
    HAS_TYPER = True
except ImportError:
    HAS_TYPER = False
    typer = None

try:
    import requests
except ImportError:
    requests = None

# Configuration
DEFAULT_SERVER_URL = "http://localhost:8000"
QUEUE_FILE = Path(__file__).parent.parent / "data" / "pending_issues.json"

app = Typer(help="OpenIssue CLI - Post issues to backend for triage") if HAS_TYPER else None


def get_server_url() -> str:
    """Get server URL from environment or default."""
    return os.getenv("OI_SERVER_URL", DEFAULT_SERVER_URL).rstrip("/")


def get_auth_headers() -> dict:
    """Get authorization headers if token is set."""
    headers = {"Content-Type": "application/json"}
    token = os.getenv("OI_API_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def load_queue() -> List[dict]:
    """Load pending issues queue from file."""
    if not QUEUE_FILE.exists():
        return []
    try:
        with open(QUEUE_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_queue(queue: List[dict]) -> None:
    """Save pending issues queue to file."""
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)


def add_to_queue(issue: dict) -> None:
    """Add an issue to the offline queue."""
    queue = load_queue()
    issue["queued_at"] = datetime.utcnow().isoformat()
    queue.append(issue)
    save_queue(queue)
    print(f"⏳ Issue queued for later submission (total: {len(queue)})")


def post_issue_to_server(issue: dict, analyze: bool = False) -> Optional[dict]:
    """Post issue to server. Returns response or None on failure."""
    if requests is None:
        print("❌ requests library not installed. Run: pip install requests")
        return None
    
    server = get_server_url()
    headers = get_auth_headers()
    
    try:
        if analyze:
            # First analyze the issue
            resp = requests.post(
                f"{server}/analyze",
                json=issue,
                headers=headers,
                timeout=30
            )
            resp.raise_for_status()
            return resp.json()
        else:
            # Direct POST to /issues
            resp = requests.post(
                f"{server}/issues",
                json=issue,
                headers=headers,
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return None
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to server at {server}")
        return None
    except requests.exceptions.HTTPError as e:
        print(f"❌ Server error: {e.response.status_code} - {e.response.text[:200]}")
        if e.response.status_code >= 500:
            return None  # Server error, queue for retry
        raise  # Client error, don't queue


def print_triage_result(result: dict) -> None:
    """Pretty print triage result."""
    print("\n" + "=" * 50)
    print("📋 TRIAGE RESULT")
    print("=" * 50)
    
    label = result.get("label", result.get("classification", "unknown"))
    priority = result.get("priority", "medium")
    labels = result.get("labels", [])
    reason = result.get("reason", "")
    source = result.get("source", "ai")
    
    # Color codes
    priority_colors = {
        "critical": "🔴",
        "high": "🟠", 
        "medium": "🟡",
        "low": "🟢"
    }
    
    print(f"  Type:     {label.upper()}")
    print(f"  Priority: {priority_colors.get(priority, '⚪')} {priority.upper()}")
    if labels:
        print(f"  Labels:   {', '.join(labels)}")
    if reason:
        print(f"  Reason:   {reason}")
    print(f"  Source:   {source}")
    print("=" * 50 + "\n")


def confirm(prompt: str) -> bool:
    """Simple yes/no confirmation."""
    response = input(f"{prompt} [y/N]: ").strip().lower()
    return response in ("y", "yes")


if HAS_TYPER:
    @app.command()
    def post(
        title: Optional[str] = Option(None, "--title", "-t", help="Issue title"),
        description: Optional[str] = Option(None, "--description", "-d", help="Issue description"),
        file: Optional[Path] = Option(None, "--file", "-f", help="Read issue from markdown file"),
        stdin: bool = Option(False, "--stdin", help="Read issue from stdin"),
        repo: Optional[str] = Option(None, "--repo", "-r", help="Repository (owner/repo)"),
        labels: Optional[str] = Option(None, "--labels", "-l", help="Comma-separated labels"),
        analyze: bool = Option(False, "--analyze", "-a", help="Analyze issue before creating"),
        interactive: bool = Option(False, "--interactive", "-i", help="Interactive mode"),
        no_queue: bool = Option(False, "--no-queue", help="Don't queue on failure"),
    ):
        """Post an issue to the OpenIssue backend for triage."""
        
        # Interactive mode
        if interactive:
            title = input("Title: ").strip()
            description = input("Description: ").strip()
            repo = input("Repository (optional, e.g. owner/repo): ").strip() or None
            labels_input = input("Labels (optional, comma-separated): ").strip()
            labels = labels_input if labels_input else None
            analyze = confirm("Analyze before creating?")
        
        # Read from file
        elif file:
            if not file.exists():
                print(f"❌ File not found: {file}")
                raise typer.Exit(1)
            content = file.read_text()
            lines = content.strip().split("\n", 1)
            title = lines[0].lstrip("#").strip()
            description = lines[1].strip() if len(lines) > 1 else ""
        
        # Read from stdin
        elif stdin:
            content = sys.stdin.read()
            lines = content.strip().split("\n", 1)
            title = lines[0].lstrip("#").strip()
            description = lines[1].strip() if len(lines) > 1 else ""
        
        # Validate required fields
        if not title:
            print("❌ Title is required")
            raise typer.Exit(1)
        
        # Build issue payload
        issue = {
            "title": title,
            "description": description or "",
        }
        if repo:
            issue["repository"] = repo
        if labels:
            issue["labels"] = [l.strip() for l in labels.split(",")]
        
        print(f"\n📝 Posting issue: {title[:50]}...")
        
        # Post to server
        try:
            result = post_issue_to_server(issue, analyze=analyze)
            
            if result is None:
                if not no_queue:
                    add_to_queue(issue)
                raise typer.Exit(1)
            
            if analyze:
                print_triage_result(result)
                if not confirm("Create this issue?"):
                    print("❌ Cancelled")
                    raise typer.Exit(0)
                # Now actually create the issue
                issue["priority"] = result.get("priority", "medium")
                issue["classification"] = result.get("label", "question")
                create_result = post_issue_to_server(issue, analyze=False)
                if create_result:
                    print(f"✅ Issue created: {create_result.get('id', 'unknown')}")
                else:
                    if not no_queue:
                        add_to_queue(issue)
            else:
                print(f"✅ Issue posted successfully")
                if "id" in result:
                    print(f"   ID: {result['id']}")
                    
        except requests.exceptions.HTTPError:
            raise typer.Exit(1)

    @app.command("flush-queue")
    def flush_queue():
        """Retry posting queued issues."""
        queue = load_queue()
        
        if not queue:
            print("✅ No pending issues in queue")
            return
        
        print(f"📤 Retrying {len(queue)} queued issue(s)...\n")
        
        failed = []
        for i, issue in enumerate(queue, 1):
            title = issue.get("title", "Untitled")[:40]
            print(f"[{i}/{len(queue)}] {title}...")
            
            # Remove queue metadata before posting
            clean_issue = {k: v for k, v in issue.items() if k != "queued_at"}
            
            result = post_issue_to_server(clean_issue)
            if result is None:
                failed.append(issue)
                print(f"   ❌ Failed")
            else:
                print(f"   ✅ Posted")
        
        save_queue(failed)
        
        success = len(queue) - len(failed)
        print(f"\n📊 Results: {success} posted, {len(failed)} failed")
        if failed:
            print(f"   Remaining in queue: {len(failed)}")

    @app.command("status")
    def status():
        """Show queue status and server connectivity."""
        queue = load_queue()
        server = get_server_url()
        
        print(f"🖥️  Server: {server}")
        print(f"📋 Queued: {len(queue)} issue(s)")
        
        # Check server connectivity
        if requests:
            try:
                resp = requests.get(f"{server}/health", timeout=5)
                if resp.ok:
                    print("✅ Server: Online")
                else:
                    print(f"⚠️  Server: Returned {resp.status_code}")
            except Exception:
                print("❌ Server: Offline or unreachable")
        else:
            print("⚠️  Cannot check server (requests not installed)")


def main_argparse():
    """Fallback CLI using argparse when Typer is not available."""
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenIssue CLI")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # post command
    post_parser = subparsers.add_parser("post", help="Post an issue")
    post_parser.add_argument("--title", "-t", required=True, help="Issue title")
    post_parser.add_argument("--description", "-d", default="", help="Issue description")
    post_parser.add_argument("--repo", "-r", help="Repository")
    post_parser.add_argument("--analyze", "-a", action="store_true", help="Analyze first")
    
    # flush-queue command
    subparsers.add_parser("flush-queue", help="Retry queued issues")
    
    # status command
    subparsers.add_parser("status", help="Show status")
    
    args = parser.parse_args()
    
    if args.command == "post":
        issue = {"title": args.title, "description": args.description}
        if args.repo:
            issue["repository"] = args.repo
        result = post_issue_to_server(issue, analyze=args.analyze)
        if result:
            if args.analyze:
                print_triage_result(result)
            print("✅ Issue posted")
        else:
            add_to_queue(issue)
            sys.exit(1)
    elif args.command == "flush-queue":
        queue = load_queue()
        if not queue:
            print("No pending issues")
            return
        failed = []
        for issue in queue:
            clean = {k: v for k, v in issue.items() if k != "queued_at"}
            if post_issue_to_server(clean) is None:
                failed.append(issue)
        save_queue(failed)
        print(f"Posted: {len(queue) - len(failed)}, Failed: {len(failed)}")
    elif args.command == "status":
        print(f"Server: {get_server_url()}")
        print(f"Queued: {len(load_queue())}")
    else:
        parser.print_help()


if __name__ == "__main__":
    if HAS_TYPER and app:
        app()
    else:
        main_argparse()
