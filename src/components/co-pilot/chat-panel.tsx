"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  createThreadAction,
  deleteThreadAction,
} from "@/server/actions/chat";
import { resolvePersonaLlm } from "@/lib/persona-llm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ChatThreadDto = {
  id: string;
  title: string | null;
  personaId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageDto = {
  id: string;
  threadId: string;
  role: string;
  content: string;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

export type ChatPersonaOption = {
  id: string;
  name: string;
  specialty: string | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
};

export type ScopeKey =
  | "profile"
  | "allergies"
  | "diagnoses"
  | "medications"
  | "supplements"
  | "labs"
  | "tests"
  | "procedures"
  | "acceptedViews"
  | "myPlan";

const SCOPE_OPTIONS: { key: ScopeKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "allergies", label: "Allergies" },
  { key: "diagnoses", label: "Diagnoses" },
  { key: "medications", label: "Meds" },
  { key: "supplements", label: "Supplements" },
  { key: "labs", label: "Labs" },
  { key: "tests", label: "Tests" },
  { key: "procedures", label: "Procedures" },
  { key: "acceptedViews", label: "Accepted views" },
  { key: "myPlan", label: "My plan" },
];

const DEFAULT_SCOPE: Record<ScopeKey, boolean> = {
  profile: true,
  allergies: true,
  diagnoses: true,
  medications: true,
  supplements: true,
  labs: true,
  tests: true,
  procedures: true,
  acceptedViews: true,
  myPlan: true,
};

type Props = {
  threads: ChatThreadDto[];
  messagesByThreadId: Record<string, ChatMessageDto[]>;
  personas: ChatPersonaOption[];
  defaultProvider: "grok" | "ollama";
  grokModel: string;
  ollamaModel: string;
  ollamaModels: string[];
  ollamaListError: string | null;
  /** Rough chart-context size (display only when using Grok). */
  contextCharEstimate: number;
  medicalDisclaimer: string;
  defaultPersonaId?: string;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function threadLabel(t: ChatThreadDto, personas: ChatPersonaOption[]): string {
  if (t.title?.trim()) return t.title.trim();
  if (t.personaId) {
    const p = personas.find((x) => x.id === t.personaId);
    if (p) return `Chat · ${p.name}`;
  }
  return "New chat";
}

export function ChatPanel({
  threads: initialThreads,
  messagesByThreadId: initialMessages,
  personas,
  defaultProvider,
  grokModel,
  ollamaModel,
  ollamaModels,
  ollamaListError,
  contextCharEstimate,
  medicalDisclaimer,
  defaultPersonaId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [threads, setThreads] = useState(initialThreads);
  const [messagesByThreadId, setMessagesByThreadId] = useState(initialMessages);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreads[0]?.id ?? null,
  );

  // Keep client state aligned after server actions / router.refresh().
  useEffect(() => {
    setThreads(initialThreads);
    setMessagesByThreadId(initialMessages);
    setSelectedThreadId((cur) => {
      if (cur && initialThreads.some((t) => t.id === cur)) return cur;
      return initialThreads[0]?.id ?? null;
    });
  }, [initialThreads, initialMessages]);

  const aiSettings = useMemo(
    () => ({ defaultProvider, grokModel, ollamaModel }),
    [defaultProvider, grokModel, ollamaModel],
  );

  const initialPersona =
    defaultPersonaId && personas.some((p) => p.id === defaultPersonaId)
      ? defaultPersonaId
      : "";
  const initialResolved = resolvePersonaLlm(
    initialPersona
      ? personas.find((p) => p.id === initialPersona)
      : null,
    aiSettings,
  );

  const [message, setMessage] = useState("");
  const [personaId, setPersonaId] = useState<string>(initialPersona);
  const [provider, setProvider] = useState<"grok" | "ollama">(
    initialResolved.provider,
  );
  /** User manually overrode provider/model — stop auto-applying persona LLM. */
  const [llmOverride, setLlmOverride] = useState(false);
  const initialOllama =
    ollamaModels.includes(ollamaModel) || ollamaModels.length === 0
      ? ollamaModel
      : ollamaModels[0]!;
  const [model, setModel] = useState(initialResolved.model);
  const [scope, setScope] = useState<Record<ScopeKey, boolean>>({
    ...DEFAULT_SCOPE,
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const suggestedModel = useMemo(
    () => (provider === "grok" ? grokModel : ollamaModel),
    [provider, grokModel, ollamaModel],
  );

  const ollamaOptions = useMemo(() => {
    const names = [...ollamaModels];
    if (ollamaModel && !names.includes(ollamaModel)) names.unshift(ollamaModel);
    if (model && !names.includes(model)) names.unshift(model);
    return names;
  }, [ollamaModels, ollamaModel, model]);

  const messages = selectedThreadId
    ? (messagesByThreadId[selectedThreadId] ?? [])
    : [];

  function applyPersonaLlm(nextPersonaId: string) {
    if (llmOverride) return;
    const persona = nextPersonaId
      ? personas.find((p) => p.id === nextPersonaId)
      : null;
    const resolved = resolvePersonaLlm(persona ?? null, aiSettings);
    setProvider(resolved.provider);
    setModel(resolved.model);
  }

  function onPersonaChange(next: string) {
    setPersonaId(next);
    applyPersonaLlm(next);
  }

  function onProviderChange(next: "grok" | "ollama") {
    setLlmOverride(true);
    setProvider(next);
    if (next === "grok") setModel(grokModel);
    else setModel(initialOllama);
  }

  function toggleScope(key: ScopeKey) {
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleNewThread() {
    setError(null);
    try {
      const result = await createThreadAction({
        title: null,
        personaId: personaId || null,
      });
      if (!result.ok) {
        setError("Could not create thread");
        return;
      }
      const t = result.thread as ChatThreadDto;
      setThreads((prev) => [t, ...prev.filter((x) => x.id !== t.id)]);
      setMessagesByThreadId((prev) => ({ ...prev, [t.id]: [] }));
      setSelectedThreadId(t.id);
        startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create thread");
    }
  }

  async function handleDeleteThread(threadId: string) {
    setError(null);
    try {
      await deleteThreadAction(threadId);
      setThreads((prev) => {
        const remaining = prev.filter((t) => t.id !== threadId);
        setSelectedThreadId((cur) =>
          cur === threadId ? (remaining[0]?.id ?? null) : cur,
        );
        return remaining;
      });
      setMessagesByThreadId((prev) => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
        startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete thread");
    }
  }

  async function sendChat() {
    setError(null);

    const content = message.trim();
    if (!content) {
      setError("Enter a message");
      return;
    }

    let threadId = selectedThreadId;
    if (!threadId) {
      try {
        const created = await createThreadAction({
          title: content.slice(0, 80),
          personaId: personaId || null,
        });
        if (!created.ok) {
          setError("Could not create thread");
          return;
        }
        const t = created.thread as ChatThreadDto;
        threadId = t.id;
        setThreads((prev) => [t, ...prev.filter((x) => x.id !== t.id)]);
        setMessagesByThreadId((prev) => ({ ...prev, [t.id]: [] }));
        setSelectedThreadId(t.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create thread");
        return;
      }
    }

    setSending(true);
    try {
      const res = await fetch("/api/co-pilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          userMessage: content,
          personaId: personaId || null,
          provider,
          model,
          scope,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        assistantMessage?: string;
        code?: string;
        charCount?: number;
        error?: string;
      };


      if (!res.ok || !data.ok || !data.assistantMessage) {
        setError(data.error || `Chat failed (${res.status})`);
        setSending(false);
        return;
      }

      const now = new Date().toISOString();
      const userMsg: ChatMessageDto = {
        id: `local-user-${now}`,
        threadId: threadId!,
        role: "user",
        content,
        provider: null,
        model: null,
        createdAt: now,
      };
      const assistantMsg: ChatMessageDto = {
        id: `local-assistant-${now}`,
        threadId: threadId!,
        role: "assistant",
        content: data.assistantMessage,
        provider,
        model,
        createdAt: now,
      };

      setMessagesByThreadId((prev) => ({
        ...prev,
        [threadId!]: [...(prev[threadId!] ?? []), userMsg, assistantMsg],
      }));
      setThreads((prev) => {
        const updated = prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                updatedAt: now,
                title: t.title?.trim() ? t.title : content.slice(0, 80),
              }
            : t,
        );
        return updated.sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
      });
      setMessage("");
        startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendChat();
  }

  const evaluateHref = personaId
    ? `/evaluate?personaId=${encodeURIComponent(personaId)}`
    : "/evaluate";

  const busy = sending || isPending;

  return (
    <div className="flex min-h-[28rem] flex-col gap-4 lg:flex-row">
      {/* Thread list */}
      <aside className="flex w-full shrink-0 flex-col rounded-lg border border-zinc-200 bg-white shadow-sm lg:w-56">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Threads
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleNewThread()}
          >
            New
          </Button>
        </div>
        <ul className="max-h-48 flex-1 overflow-y-auto lg:max-h-[28rem]">
          {threads.length === 0 ? (
            <li className="px-3 py-4 text-sm text-zinc-500">
              No threads yet. Send a message or create one.
            </li>
          ) : (
            threads.map((t) => {
              const selected = t.id === selectedThreadId;
              return (
                <li key={t.id} className="border-b border-zinc-100 last:border-0">
                  <div
                    className={`flex items-start gap-1 px-2 py-2 ${
                      selected ? "bg-zinc-100" : "hover:bg-zinc-50"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSelectedThreadId(t.id);
                                            setError(null);
                      }}
                    >
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {threadLabel(t, personas)}
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-zinc-500">
                        {formatTime(t.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-red-700"
                      title="Delete thread"
                      disabled={busy}
                      onClick={() => void handleDeleteThread(t.id)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Transcript + composer */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-h-[14rem] flex-1 flex-col rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-2">
            <h2 className="text-sm font-medium text-zinc-900">
              {selectedThreadId
                ? threadLabel(
                    threads.find((t) => t.id === selectedThreadId) ?? {
                      id: selectedThreadId,
                      title: null,
                      personaId: null,
                      createdAt: "",
                      updatedAt: "",
                    },
                    personas,
                  )
                : "Chat"}
            </h2>
            <p className="text-xs text-zinc-500">
              Grounded in live chart facts and accepted brief views only. Chat does
              not write brief memory.
            </p>
          </div>

          <div className="flex max-h-[22rem] flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Ask about meds, labs, or your plan. Narrow scope below if the
                chart is large.
              </p>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user";
                const isSystem = m.role === "system";
                return (
                  <div
                    key={m.id}
                    className={`max-w-[95%] rounded-lg px-3 py-2 text-sm ${
                      isUser
                        ? "ml-auto bg-zinc-900 text-white"
                        : isSystem
                          ? "border border-zinc-200 bg-zinc-50 text-zinc-600"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    <div
                      className={`mb-1 text-[10px] font-medium uppercase tracking-wide ${
                        isUser ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {isUser
                        ? "You"
                        : isSystem
                          ? "System"
                          : "Co-pilot"}
                      {m.model ? (
                        <span className="ml-1 font-normal normal-case opacity-80">
                          · {m.provider}/{m.model}
                        </span>
                      ) : null}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <Label>
            Message
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={8000}
              placeholder="e.g. What do my recent iron labs look like with current supplements?"
              disabled={busy}
              required
            />
          </Label>

          <div className="grid gap-3 sm:grid-cols-3">
            <Label>
              Persona lens
              <Select
                value={personaId}
                onChange={(e) => onPersonaChange(e.target.value)}
                disabled={busy}
              >
                <option value="">None (general chat)</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.specialty ? ` · ${p.specialty}` : ""}
                  </option>
                ))}
              </Select>
            </Label>

            <Label>
              Provider
              <Select
                value={provider}
                onChange={(e) =>
                  onProviderChange(e.target.value as "grok" | "ollama")
                }
                disabled={busy}
                required
              >
                <option value="ollama">Ollama (local)</option>
                <option value="grok">Grok (cloud)</option>
              </Select>
            </Label>

            <Label>
              Model
              {provider === "ollama" && ollamaOptions.length > 0 ? (
                <Select
                  value={model}
                  onChange={(e) => {
                    setLlmOverride(true);
                    setModel(e.target.value);
                  }}
                  disabled={busy}
                  required
                >
                  {ollamaOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={model}
                  onChange={(e) => {
                    setLlmOverride(true);
                    setModel(e.target.value);
                  }}
                  placeholder={suggestedModel}
                  maxLength={100}
                  disabled={busy}
                  required
                />
              )}
            </Label>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-zinc-900">
              Chart context scope
            </legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {SCOPE_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-700"
                >
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                    checked={scope[key]}
                    onChange={() => toggleScope(key)}
                    disabled={busy}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {provider === "grok" ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Grok sends chart context to xAI. Estimated payload:{" "}
              <span className="font-medium tabular-nums">
                {contextCharEstimate.toLocaleString()}
              </span>{" "}
              characters (full default scope; actual depends on checkboxes).
            </p>
          ) : (
            <div className="space-y-1 text-xs text-zinc-500">
              <p>Ollama runs locally. Chat starts immediately.</p>
              {ollamaOptions.length === 0 ? (
                <p className="text-amber-800">
                  {ollamaListError ??
                    "No local Ollama models found. Pull a model and refresh, or type a model name."}
                </p>
              ) : null}
            </div>
          )}

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button type="submit" disabled={busy || !message.trim()}>
              {sending ? "Sending…" : "Send"}
            </Button>
            <Link
              href={evaluateHref}
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              {personaId
                ? "Evaluate with this persona"
                : "Open Evaluate"}
            </Link>
            <Link
              href="/brief"
              className="text-sm text-zinc-600 underline-offset-2 hover:underline"
            >
              Chart brief
            </Link>
          </div>
        </form>

        <p className="text-xs text-zinc-500">{medicalDisclaimer}</p>
      </div>
    </div>
  );
}
