import { useCallback, useEffect, useState } from "react";
import {
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { useComposerSend } from "@assistant-ui/core/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { validateMessage } from "../../lib/validation";
import { useAgUiError } from "../../providers/AgUiRuntimeProvider";

function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md prose prose-sm max-w-none dark:prose-invert"
    />
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mb-4 flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-blue-600 px-4 py-2 text-white">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mb-4 flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
          }}
        />
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

function ThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  if (role === "user") {
    return <UserMessage />;
  }
  return <AssistantMessage />;
}

function ChatComposer() {
  const [validationError, setValidationError] = useState<string | null>(null);
  const text = useAuiState((state) => state.composer.text);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const { send } = useComposerSend();

  const attemptSend = useCallback(() => {
    const error = validateMessage(text);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    send();
  }, [send, text]);

  useEffect(() => {
    if (!validationError) {
      return;
    }
    const error = validateMessage(text);
    if (!error) {
      setValidationError(null);
    }
  }, [text, validationError]);

  return (
    <ComposerPrimitive.Root
      className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      onSubmit={(event) => {
        event.preventDefault();
        attemptSend();
      }}
    >
      <ComposerPrimitive.Input
        placeholder="輸入訊息…"
        rows={1}
        autoFocus
        enterKeyHint="send"
        aria-label="訊息輸入"
        className="max-h-32 min-h-10 w-full resize-none bg-transparent px-1 py-1 text-base outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-500">
          {text.length}/{8000}
        </span>
        <AuiIf condition={(state) => !state.thread.isRunning}>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="送出訊息"
          >
            送出
          </button>
        </AuiIf>
        <AuiIf condition={(state) => state.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <button
              type="button"
              className="rounded-xl bg-zinc-500 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              aria-label="取消回覆"
            >
              取消
            </button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
      {validationError ? (
        <p role="alert" className="text-sm text-red-600">
          {validationError}
        </p>
      ) : null}
      {isRunning ? (
        <p className="text-sm text-zinc-500" aria-live="polite">
          助理正在回覆中…
        </p>
      ) : null}
    </ComposerPrimitive.Root>
  );
}

function RuntimeErrorBanner() {
  const { runtimeError, clearRuntimeError } = useAgUiError();
  if (!runtimeError) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span>{runtimeError}</span>
      <button
        type="button"
        onClick={clearRuntimeError}
        className="shrink-0 text-red-700 underline"
      >
        關閉
      </button>
    </div>
  );
}

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <RuntimeErrorBanner />
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              智慧助理對話
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              輸入訊息開始對話，助理將以繁體中文串流回覆。
            </p>
          </div>
        </AuiIf>
        <ThreadPrimitive.Messages components={{ Message: ThreadMessage }} />
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-zinc-50 pt-4 dark:bg-zinc-950">
          <ThreadPrimitive.ScrollToBottom className="mb-2 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            捲動至最新
          </ThreadPrimitive.ScrollToBottom>
          <ChatComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
