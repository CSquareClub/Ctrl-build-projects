"""OpenIssue API application package."""

from __future__ import annotations

import sys


# Allow both import styles:
# - app.* when running from services/api
# - api.app.* when running from services
sys.modules.setdefault("app", sys.modules[__name__])
