"""
Rename module for chat title management.

This module contains:
- backuprenamelogic.py: Rule-based rename logic (original approach)
- ai_rename.py: AI-powered title generation using Groq
- rename_controller.py: Orchestrator that decides which approach to use

Architecture:
1. Rule-based rename tries first on the FIRST meaningful message
2. AI-based rename is a FALLBACK when rule-based fails after 2+ messages

Author: Senior Backend Engineer
Date: January 2026
"""
from .rename_controller import handle_chat_rename, should_rename_chat

__all__ = ["handle_chat_rename", "should_rename_chat"]
