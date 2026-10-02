"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { ConversationSummary, Message } from "@/lib/types";

type Props = {
  lang: Lang;
  t: Translator;
  userId: string;
  initialConversationId: string | null;
};

const LIST_POLL_MS = 10000;
const THREAD_POLL_MS = 4000;

function formatTime(lang: Lang, iso: string): string {
  return new Date(iso).toLocaleString(lang === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InboxContent({ lang, t, userId, initialConversationId }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, LIST_POLL_MS);
    return () => clearInterval(id);
  }, []);

  async function loadMessages(conversationId: string) {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (res.ok) setMessages(await res.json());
  }

  useEffect(() => {
    if (!selectedId) {
      setMessages(null);
      return;
    }
    setMessages(null);
    loadMessages(selectedId);
    fetch(`/api/conversations/${selectedId}/read`, { method: "PATCH" }).then(loadConversations);

    const id = setInterval(() => loadMessages(selectedId), THREAD_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setDraft("");
      await loadMessages(selectedId);
      loadConversations();
    }
  }

  const selected = conversations?.find((c) => c.id === selectedId) || null;

  return (
    <div className={`inbox-layout${selectedId ? " has-selection" : ""}`}>
      <div className="inbox-list">
        {conversations === null ? (
          <p style={{ color: "var(--ink-muted)", padding: 16 }}>…</p>
        ) : conversations.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 16px" }}>
            <p>{t.inboxEmpty}</p>
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              className={`inbox-list-item${c.id === selectedId ? " active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="row1">
                <div className="space-title">{c.space_title}</div>
                {c.unread_count > 0 && <span className="inbox-unread-dot" />}
              </div>
              <div className="other-party">{c.other_party_name}</div>
              {c.last_message_preview && <div className="preview">{c.last_message_preview}</div>}
            </button>
          ))
        )}
      </div>

      <div className="inbox-thread">
        {!selectedId ? (
          <div className="inbox-empty-thread">{t.selectConversation}</div>
        ) : (
          <>
            <div className="inbox-thread-header">
              <button type="button" className="inbox-back" onClick={() => setSelectedId(null)} aria-label="Back">
                ←
              </button>
              <div>
                <div>{selected ? selected.other_party_name : "…"}</div>
                {selected && (
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: "var(--ink-muted)" }}>{selected.space_title}</div>
                )}
              </div>
            </div>

            <div className="inbox-messages">
              {messages === null ? (
                <p style={{ color: "var(--ink-muted)" }}>…</p>
              ) : messages.length === 0 ? (
                <p style={{ color: "var(--ink-muted)", fontSize: 13.5 }}>{t.noMessagesYet}</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`message-row ${mine ? "mine" : "theirs"}`}>
                      <div className="message-bubble">{m.body}</div>
                      <div className="message-time">{formatTime(lang, m.created_at)}</div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="inbox-compose" onSubmit={send}>
              <textarea
                rows={1}
                placeholder={t.messagePlaceholder}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
              />
              <button type="submit" className="btn-primary" disabled={sending || !draft.trim()}>
                {t.sendMessage}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
