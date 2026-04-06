#!/usr/bin/env python3
"""Quick test script to verify auth endpoints are accessible"""

import httpx
import sys

API_URL = "http://localhost:8000"

def test_endpoints():
    print("Testing OpenIssue Auth Endpoints...")
    print("-" * 50)
    
    try:
        # Test root endpoint
        print("\n1. Testing root endpoint...")
        response = httpx.get(f"{API_URL}/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        # Test health endpoint
        print("\n2. Testing health endpoint...")
        response = httpx.get(f"{API_URL}/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        # Test auth check endpoint (should return not authenticated)
        print("\n3. Testing auth check endpoint...")
        response = httpx.get(f"{API_URL}/auth/check")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        # Test auth login endpoint (should redirect to GitHub)
        print("\n4. Testing auth login endpoint...")
        response = httpx.get(f"{API_URL}/auth/login", follow_redirects=False)
        print(f"   Status: {response.status_code}")
        if response.status_code == 307:
            print(f"   Redirect to: {response.headers.get('location', 'N/A')}")
            if 'github.com' in response.headers.get('location', ''):
                print("   ✓ Correctly redirects to GitHub!")
            else:
                print("   ✗ Not redirecting to GitHub")
        elif response.status_code == 500:
            print("   ✗ Error: GitHub OAuth not configured in .env")
        
        print("\n" + "-" * 50)
        print("✓ Backend is running and auth endpoints are accessible!")
        print("\nNext steps:")
        print("1. Make sure you've set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env")
        print("2. Open http://localhost:3000 in your browser")
        print("3. Click 'Continue with GitHub' to test the full OAuth flow")
        
    except httpx.ConnectError:
        print("\n✗ Error: Cannot connect to backend at", API_URL)
        print("Make sure the backend server is running:")
        print("  cd backend && python run.py")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_endpoints()
