import re


def sanitize_title(text: str, max_length: int = 100) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    if len(text) > max_length:
        return text[:max_length].rsplit(" ", 1)[0].rstrip() + "..."
    return text or "New Conversation"
