"""
ChatTutor — PDF Generation Service
Converts notes text to downloadable PDF using reportlab
"""

import io
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT  # noqa: F401


def strip_emoji(text: str) -> str:
    """
    Remove emoji and non-Latin-1 characters that ReportLab cannot render.
    Keeps standard ASCII, numbers, punctuation, and common diacritics.
    """
    # Remove emoji and other non-BMP characters
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"
        "\U0001FA70-\U0001FAFF"
        "]+",
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text).strip()


def generate_pdf(topic: str, notes: str, user_name: str, user_goal: str) -> bytes:
    """
    Generate a professionally styled PDF from notes text.
    Returns bytes for streaming response.
    """
    buffer = io.BytesIO()

    # Sanitize inputs — ReportLab can't render emoji with default fonts
    topic_clean    = strip_emoji(topic)
    user_name_clean = strip_emoji(user_name)
    user_goal_clean = strip_emoji(user_goal)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch
    )

    styles = getSampleStyleSheet()

    # ─── Custom Styles ────────────────────────────────────────────────────

    title_style = ParagraphStyle(
        "ChatTutorTitle",
        parent=styles["Heading1"],
        fontSize=22,
        spaceAfter=6,
        textColor=colors.HexColor("#6C3FC5"),
        alignment=TA_CENTER,
        fontName="Helvetica-Bold"
    )

    subtitle_style = ParagraphStyle(
        "ChatTutorSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        spaceAfter=4,
        textColor=colors.HexColor("#888888"),
        alignment=TA_CENTER
    )

    heading_style = ParagraphStyle(
        "NoteHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=14,
        spaceAfter=6,
        textColor=colors.HexColor("#6C3FC5"),
        fontName="Helvetica-Bold"
    )

    body_style = ParagraphStyle(
        "NoteBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=15,
        spaceAfter=4,
        textColor=colors.HexColor("#333333")
    )

    bullet_style = ParagraphStyle(
        "NoteBullet",
        parent=body_style,
        leftIndent=20,
        bulletIndent=10,
        spaceAfter=3
    )

    # ─── Build Document ───────────────────────────────────────────────────

    story = []

    # Header Banner
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("ChatTutor", title_style))
    story.append(Paragraph("AI-Powered Personalized Learning", subtitle_style))
    story.append(Spacer(1, 0.05 * inch))

    # User Info Table
    user_data = [
        ["Student",      user_name_clean],
        ["Learning Goal", user_goal_clean],
        ["Topic",        topic_clean]
    ]
    user_table = Table(user_data, colWidths=[1.5 * inch, 5 * inch])
    user_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#6C3FC5")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#DDDDDD")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#F8F5FF"), colors.white]),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(user_table)
    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#6C3FC5")))
    story.append(Spacer(1, 0.1 * inch))

    # Notes Content — parse markdown-like syntax
    lines = notes.split("\n")
    in_bullet = False  # noqa: F841

    for line in lines:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.05 * inch))
            in_bullet = False
            continue

        # Strip emoji before rendering
        line = strip_emoji(line)
        if not line:  # skip if only emoji
            continue

        # H1
        if line.startswith("# "):
            text = line[2:].strip()
            story.append(Paragraph(text, title_style))
        # H2
        elif line.startswith("## "):
            text = line[3:].strip()
            story.append(Paragraph(text, heading_style))
        # H3
        elif line.startswith("### "):
            text = line[4:].strip()
            story.append(Paragraph(f"<b>{text}</b>", body_style))
        # Bullet points
        elif line.startswith("- ") or line.startswith("• "):
            text = line[2:].strip()
            # Handle bold markdown **text**
            text = text.replace("**", "<b>", 1).replace("**", "</b>", 1)
            story.append(Paragraph(f"• {text}", bullet_style))
            in_bullet = True
        # Numbered lists
        elif len(line) > 2 and line[0].isdigit() and line[1] in ".):":
            text = line[2:].strip()
            story.append(Paragraph(f"&nbsp;&nbsp;{line[0]}. {text}", bullet_style))
        # Horizontal rule
        elif line.startswith("---"):
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#AAAAAA")))
        else:
            # Bold inline
            text = line.replace("**", "<b>", 1).replace("**", "</b>", 1)
            story.append(Paragraph(text, body_style))

    # Footer
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#AAAAAA")))
    story.append(Paragraph(
        "Generated by ChatTutor AI Platform | Your personalized learning companion",
        subtitle_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
