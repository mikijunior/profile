"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  UserRound
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CHAT_TOKEN_HEADER, MAX_CHAT_MESSAGES } from "@/lib/chat-config";
import { chatStarters } from "@/lib/career-profile";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const chatRequestToken = process.env.NEXT_PUBLIC_CHAT_REQUEST_TOKEN;

const initialMessages: Message[] = [
  {
    id: 0,
    role: "assistant",
    content:
      "Hi, I am Serhii's digital twin. Ask me about his Laravel experience, SaaS work, architecture background, or career fit."
  }
];

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdownMessage">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function DigitalTwinChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(1);

  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

  useEffect(() => {
    const messagePane = messagesRef.current;

    if (!messagePane) {
      return;
    }

    requestAnimationFrame(() => {
      messagePane.scrollTo({
        top: messagePane.scrollHeight,
        behavior: "smooth"
      });
    });
  }, [visibleMessages, isLoading]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const nextMessages: Message[] = [
      ...messages,
      { id: nextMessageId.current, role: "user", content: trimmed }
    ];
    nextMessageId.current += 1;

    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);
    setSuggestionsOpen(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(chatRequestToken ? { [CHAT_TOKEN_HEADER]: chatRequestToken } : {})
        },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.role === "user")
            .slice(-MAX_CHAT_MESSAGES)
            .map(({ role, content }) => ({ role, content }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "The AI chat is unavailable.");
      }

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current,
          role: "assistant",
          content: data.answer
        }
      ]);
      nextMessageId.current += 1;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "The AI chat is unavailable.";

      setError(message);
      setMessages((current) => current.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="chatShell" aria-label="AI career chat">
      <div className="chatHeader">
        <div>
          <span>
            <Sparkles size={16} aria-hidden="true" />
            Digital twin
          </span>
          <h3>Ask about my career</h3>
        </div>
        <div className="modelBadge">OpenRouter</div>
      </div>

      <div className="chatMessages" ref={messagesRef}>
        {visibleMessages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              className={`chatMessage ${isAssistant ? "assistant" : "user"}`}
              key={message.id}
            >
              <div className="messageAvatar">
                {isAssistant ? (
                  <Bot size={17} aria-hidden="true" />
                ) : (
                  <UserRound size={17} aria-hidden="true" />
                )}
              </div>
              <MarkdownMessage content={message.content} />
            </div>
          );
        })}
        {isLoading ? (
          <div className="chatMessage assistant">
            <div className="messageAvatar">
              <Loader2 className="spin" size={17} aria-hidden="true" />
            </div>
            <MarkdownMessage content="Thinking through the career context..." />
          </div>
        ) : null}
      </div>

      <div className={`starterPanel ${suggestionsOpen ? "open" : ""}`}>
        <button
          className="starterToggle"
          type="button"
          onClick={() => setSuggestionsOpen((current) => !current)}
          aria-expanded={suggestionsOpen}
          aria-controls="career-chat-starters"
        >
          <span>
            <Lightbulb size={15} aria-hidden="true" />
            Suggested questions
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {suggestionsOpen ? (
          <div
            className="starterRow"
            id="career-chat-starters"
            aria-label="Suggested questions"
          >
            {chatStarters.map((starter) => (
              <button
                type="button"
                key={starter}
                onClick={() => void sendMessage(starter)}
                disabled={isLoading}
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form className="chatForm" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={500}
          placeholder="Ask about Serhii's experience..."
          aria-label="Ask the digital twin"
          disabled={isLoading}
        />
        <button
          type="submit"
          aria-label="Send question"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <Loader2 className="spin" size={19} aria-hidden="true" />
          ) : (
            <Send size={19} aria-hidden="true" />
          )}
        </button>
      </form>
      <p className="chatPrivacy">
        Questions are processed by a third-party AI provider and should not
        include private details.
      </p>
      {error ? <p className="chatError">{error}</p> : null}
      <div className="srOnly" role="status" aria-live="polite">
        {isLoading ? "Preparing an answer." : error || ""}
      </div>
    </div>
  );
}
