from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Conversation, Message, Space, User
from app.schemas import (
    ConversationOut,
    ConversationStart,
    ConversationSummaryOut,
    MessageCreate,
    MessageOut,
    UnreadCountOut,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    data: ConversationStart,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find-or-create: a renter messaging about a listing they've already
    messaged about just reopens the same thread (see the unique constraint
    on (space_id, renter_id) in models.Conversation)."""
    space = await db.get(Space, data.space_id)
    if space is None or not space.is_active or space.status != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    if space.owner_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't message your own listing")

    existing = await db.execute(
        select(Conversation).where(Conversation.space_id == data.space_id, Conversation.renter_id == user.id)
    )
    conversation = existing.scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(space_id=data.space_id, host_id=space.owner_id, renter_id=user.id)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    return conversation


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Powers the header inbox badge -- deliberately cheap (one count query)
    so it can be polled often without pulling full conversation summaries."""
    result = await db.execute(
        select(func.count())
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(
            or_(Conversation.host_id == user.id, Conversation.renter_id == user.id),
            Message.sender_id != user.id,
            Message.read_at.is_(None),
        )
    )
    return UnreadCountOut(count=result.scalar_one())


@router.get("", response_model=list[ConversationSummaryOut])
async def list_conversations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Every thread the current user is part of, as either host or renter,
    most recently active first. Runs a couple of small extra queries per
    conversation (other party's name, last message, unread count) rather
    than one bigger joined query -- simpler to read, and fine at the
    conversation-per-user counts a marketplace like this actually has."""
    result = await db.execute(
        select(Conversation, Space)
        .join(Space, Conversation.space_id == Space.id)
        .where(or_(Conversation.host_id == user.id, Conversation.renter_id == user.id))
        .order_by(Conversation.last_message_at.desc())
    )
    rows = result.all()

    out = []
    for conversation, space in rows:
        other_id = conversation.renter_id if conversation.host_id == user.id else conversation.host_id
        other = await db.get(User, other_id)

        last_message = (
            await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.desc())
                .limit(1)
            )
        ).scalars().first()

        unread = (
            await db.execute(
                select(func.count())
                .select_from(Message)
                .where(
                    Message.conversation_id == conversation.id,
                    Message.sender_id != user.id,
                    Message.read_at.is_(None),
                )
            )
        ).scalar_one()

        out.append(
            ConversationSummaryOut(
                **ConversationOut.model_validate(conversation).model_dump(),
                space_title=space.title,
                other_party_name=other.name if other else "?",
                last_message_preview=last_message.body[:140] if last_message else "",
                unread_count=unread,
            )
        )
    return out


async def _get_participant_conversation(db: AsyncSession, conversation_id: str, user: User) -> Conversation:
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None or (conversation.host_id != user.id and conversation.renter_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_participant_conversation(db, conversation_id, user)
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at)
    )
    return result.scalars().all()


@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    data: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_participant_conversation(db, conversation_id, user)
    message = Message(conversation_id=conversation.id, sender_id=user.id, body=data.body)
    db.add(message)
    conversation.last_message_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(message)
    return message


@router.patch("/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_participant_conversation(db, conversation_id, user)
    await db.execute(
        update(Message)
        .where(Message.conversation_id == conversation.id, Message.sender_id != user.id, Message.read_at.is_(None))
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()
