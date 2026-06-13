import json
import os
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.provider import stream_chat
from app.services.auth_service import get_current_user
from app.services.provider_service import has_enabled_providers
from app.services.router_service import route_chat
from app.services.conversation_service import (
    create_conversation,
    get_conversation,
    add_message,
    auto_title_conversation,
)
from app.services.llm_service import get_provider_config
from app.models.attachment import Attachment
from app.schemas.conversation import ConversationCreate
from app.schemas.chat import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])
security = HTTPBearer()


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, credentials.credentials)
    provider = get_provider_config(db, user.id)

    if not provider.base_url or not provider.model:
        raise HTTPException(
            status_code=400,
            detail="Provider not configured. Open Settings to set your API key and model.",
        )

    if request.conversation_id:
        conv = get_conversation(db, request.conversation_id, user.id)
    else:
        conv = create_conversation(db, user.id, ConversationCreate(model=request.model or provider.model))

    # Build message content (prepend attachment text if any)
    user_content = request.message
    attachment_refs = []
    if request.attachment_ids:
        for att_id in request.attachment_ids:
            att = db.query(Attachment).filter(
                Attachment.id == att_id, Attachment.user_id == user.id
            ).first()
            if att:
                attachment_refs.append(att)
                if att.content_type.startswith("text/") or att.content_type == "application/json":
                    try:
                        with open(att.file_path, "r", encoding="utf-8", errors="replace") as f:
                            file_text = f.read(8000)
                        user_content = f"[Attachment: {att.filename}]\n```\n{file_text}\n```\n\n{user_content}"
                    except Exception:
                        pass
                elif att.content_type == "application/pdf":
                    try:
                        import fitz  # PyMuPDF
                        doc = fitz.open(att.file_path)
                        pages_text = []
                        char_budget = 12000
                        for page in doc:
                            page_text = page.get_text()
                            if char_budget <= 0:
                                break
                            pages_text.append(page_text[:char_budget])
                            char_budget -= len(page_text)
                        doc.close()
                        pdf_text = "\n".join(pages_text).strip()
                        if pdf_text:
                            user_content = f"[PDF: {att.filename}]\n{pdf_text}\n\n{user_content}"
                        else:
                            user_content = f"[PDF: {att.filename} — no extractable text (scanned/image-only)]\n\n{user_content}"
                    except Exception:
                        user_content = f"[PDF: {att.filename} — could not extract text]\n\n{user_content}"
                else:
                    user_content = f"[Attachment: {att.filename} ({att.content_type})]\n\n{user_content}"

    # Save the original message (no file content) so the UI shows clean text
    user_msg = add_message(db, conv.id, "user", request.message)
    # Link attachments to the saved message
    for att in attachment_refs:
        att.message_id = user_msg.id
    if attachment_refs:
        db.commit()

    auto_title_conversation(db, conv.id, request.message)

    db.refresh(conv)

    system_prompt = (
        "You are a helpful assistant. You MUST format every response as proper Markdown. Follow these rules strictly:\n\n"
        "1. HEADINGS: Always use `#`, `##`, or `###` for any title or section header. Never write a heading as plain text or bold text. Example: `## Introduction`\n"
        "2. LISTS: When listing items, points, steps, or examples, ALWAYS use `- item` for bullets or `1. item` for numbered lists. Never write list items as bold text like `**Point:**`. Every list item must start with `- ` or a number.\n"
        "3. BOLD: Use **bold** only for emphasizing key terms within a sentence, not as a substitute for headings or list markers.\n"
        "4. SPACING: Always leave a blank line before and after headings, lists, and paragraphs.\n"
        "5. CODE: Use triple backtick code blocks with a language tag for any code.\n"
        "6. MATH: Use `$...$` for inline math and `$$...$$` for block equations.\n\n"
        "Your output will be rendered as Markdown, so raw `#` and `-` characters will become visual headings and bullet points. Use them."
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in conv.messages]
    # user_content already added to DB; use it as the last message content
    if messages:
        messages[-1]["content"] = user_content

    # Extract all primitives before the DI session closes
    base_url = provider.base_url
    api_key = provider.api_key
    model = request.model or provider.model
    conv_id: UUID = conv.id
    user_id: UUID = user.id
    preferred_provider_id = str(request.provider_id) if request.provider_id else None
    use_router = has_enabled_providers(db, user.id)

    async def generate():
        full_response = ""
        try:
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': str(conv_id)})}\n\n"

            with SessionLocal() as stream_db:
                if use_router:
                    chunks = route_chat(stream_db, user_id, model, messages, preferred_provider_id)
                else:
                    chunks = stream_chat(base_url=base_url, api_key=api_key, model=model, messages=messages)

                async for chunk in chunks:
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            with SessionLocal() as fresh_db:
                add_message(fresh_db, conv_id, "assistant", full_response)

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': str(conv_id)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
