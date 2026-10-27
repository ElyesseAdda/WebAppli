import React, { useEffect, useRef, useState } from "react";
import { IoClose, IoSend } from "react-icons/io5";
import logo from "../img/zonia-mark.png";
import "./../../static/css/zoniaChat.css";

const SUGGESTIONS = [
  "Où créer un devis ?",
  "Comment faire une situation ?",
  "Où trouver le planning ?",
];

/**
 * Mémoire hors du composant : un changement de page ne démonte pas Zonia,
 * et un remontage éventuel du shell retrouve la même conversation.
 */
const memory = {
  open: false,
  draft: "",
  messages: null,
};

let sequence = 0;
const nextId = () => {
  sequence += 1;
  return `zonia-${sequence}`;
};

const welcomeText = (user) => {
  const firstName = (user?.first_name || "").trim();
  const hello = firstName ? `Bonjour ${firstName}.` : "Bonjour.";
  return `${hello} Je suis Zonia, l'assistant de P3000. Posez votre question : cette conversation reste ouverte lorsque vous changez de page.`;
};

const previewReply = (question) => {
  const short = question.length > 90 ? `${question.slice(0, 87)}…` : question;
  return `« ${short} » — message bien reçu. Zonia n'est pas encore connecté : je répondrai à partir du guide de l'application dès le branchement.`;
};

/**
 * Point de branchement futur.
 * Remplacer le délai par l'appel à l'assistant : la fenêtre et l'animation restent les mêmes.
 */
const requestZoniaReply = (text, signal) => {
  const delay = 1400 + Math.round(Math.random() * 450);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(previewReply(text)), delay);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

const ZoniaMark = ({ thinking, small }) => (
  <span className={`zonia-mark${small ? " zonia-mark-sm" : ""}${thinking ? " is-thinking" : ""}`}>
    <img src={logo} alt="" />
  </span>
);

const ZoniaChat = ({ user, isMobile }) => {
  const [open, setOpen] = useState(memory.open);
  const [draft, setDraft] = useState(memory.draft);
  const [messages, setMessages] = useState(
    () => memory.messages || [{ id: "welcome", role: "assistant", text: welcomeText(user) }]
  );
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    memory.open = open;
    memory.draft = draft;
    memory.messages = messages;
  }, [open, draft, messages]);

  useEffect(() => {
    const firstName = (user?.first_name || "").trim();
    if (!firstName) return;
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].id !== "welcome") return prev;
      const text = welcomeText(user);
      if (prev[0].text === text) return prev;
      return [{ ...prev[0], text }];
    });
  }, [user]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const resizeInput = (element) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 112)}px`;
  };

  const sendText = async (raw) => {
    const text = raw.trim();
    if (!text || thinking) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setThinking(true);

    try {
      const reply = await requestZoniaReply(text, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: reply }]);
    } catch (error) {
      if (error?.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "Une erreur est survenue. Réessayez dans un instant.",
        },
      ]);
    } finally {
      if (!controller.signal.aborted) setThinking(false);
    }
  };

  const onDraftChange = (event) => {
    setDraft(event.target.value);
    resizeInput(event.target);
  };

  const onDraftKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendText(draft);
    }
  };

  const showSuggestions = messages.length === 1 && messages[0].id === "welcome" && !thinking;
  const fabLabel = thinking ? "Zonia réfléchit…" : open ? "Fermer" : "Zonia";

  return (
    <div className={`zonia-root${open ? " is-open" : ""}${isMobile ? " is-mobile" : ""}`}>
      <section
        id="zonia-panel"
        className={`zonia-panel${open ? " is-open" : ""}${thinking ? " is-thinking" : ""}`}
        role="dialog"
        aria-label="Conversation avec Zonia"
        aria-hidden={!open}
      >
        <header className="zonia-header">
          <ZoniaMark thinking={thinking} />
          <div className="zonia-header-copy">
            <h2 className="zonia-header-title">
              Zonia
              <span className="zonia-status" aria-hidden="true" />
            </h2>
            <p className="zonia-header-sub">
              {thinking ? "Réflexion en cours" : "Assistant P3000"}
            </p>
          </div>
          <button
            type="button"
            className="zonia-close"
            onClick={() => setOpen(false)}
            aria-label="Fermer Zonia"
          >
            <IoClose size={20} />
          </button>
          <div className="zonia-header-progress" aria-hidden="true" />
        </header>

        <div className="zonia-messages">
          {messages.map((message) => (
            <div key={message.id} className={`zonia-row is-${message.role}`}>
              {message.role === "assistant" && <ZoniaMark small />}
              <div className="zonia-bubble">{message.text}</div>
            </div>
          ))}
          {thinking && (
            <div className="zonia-row is-assistant">
              <ZoniaMark small thinking />
              <div className="zonia-bubble zonia-bubble-thinking" aria-label="Zonia réfléchit">
                <div className="zonia-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
          {showSuggestions && (
            <div className="zonia-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="zonia-chip"
                  onClick={() => sendText(suggestion)}
                  disabled={thinking}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="zonia-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendText(draft);
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder="Écrire à Zonia…"
            aria-label="Message pour Zonia"
            maxLength={2000}
            tabIndex={open ? 0 : -1}
            onChange={onDraftChange}
            onKeyDown={onDraftKeyDown}
          />
          <button
            type="submit"
            className="zonia-send"
            disabled={!draft.trim() || thinking}
            aria-label="Envoyer"
            tabIndex={open ? 0 : -1}
          >
            <IoSend size={18} />
          </button>
        </form>
      </section>

      <button
        type="button"
        className={`zonia-fab${thinking ? " is-thinking" : ""}`}
        aria-expanded={open}
        aria-controls="zonia-panel"
        aria-label={thinking ? "Zonia réfléchit" : open ? "Fermer Zonia" : "Ouvrir Zonia"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="zonia-fab-ring" aria-hidden="true" />
        <span className="zonia-fab-disc">
          <img src={logo} alt="" />
        </span>
        <span className="zonia-fab-label">{fabLabel}</span>
      </button>
    </div>
  );
};

export default ZoniaChat;
