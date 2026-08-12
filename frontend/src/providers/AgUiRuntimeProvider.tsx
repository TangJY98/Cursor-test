import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { HttpAgent } from "@ag-ui/client";
import { CONNECTION_FAILED, STREAM_INTERRUPTED } from "../lib/errors";

const DEFAULT_AGENT_URL = "http://localhost:7777/agui";

export function getAgentUrl(): string {
  return import.meta.env.VITE_AGUI_AGENT_URL ?? DEFAULT_AGENT_URL;
}

function isConnectionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    error.name === "TypeError" ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("connection refused") ||
    message.includes("econnrefused")
  );
}

type AgUiErrorContextValue = {
  runtimeError: string | null;
  clearRuntimeError: () => void;
};

const AgUiErrorContext = createContext<AgUiErrorContextValue>({
  runtimeError: null,
  clearRuntimeError: () => undefined,
});

export function useAgUiError(): AgUiErrorContextValue {
  return useContext(AgUiErrorContext);
}

type AgUiRuntimeProviderProps = {
  children: ReactNode;
};

export function AgUiRuntimeProvider({ children }: AgUiRuntimeProviderProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const agentUrl = getAgentUrl();

  const agent = useMemo(
    () =>
      new HttpAgent({
        url: agentUrl,
      }),
    [agentUrl],
  );

  const runtime = useAgUiRuntime({
    agent,
    logger: {
      debug: (...args: unknown[]) => {
        const [event, meta] = args;
        const threadId =
          meta && typeof meta === "object" && "threadId" in meta
            ? (meta as { threadId?: string }).threadId
            : undefined;
        const runId =
          meta && typeof meta === "object" && "runId" in meta
            ? (meta as { runId?: string }).runId
            : undefined;
        console.debug("[agui]", { event, threadId, runId, meta });
      },
      error: (...args: unknown[]) => {
        const [event, meta] = args;
        const threadId =
          meta && typeof meta === "object" && "threadId" in meta
            ? (meta as { threadId?: string }).threadId
            : undefined;
        const runId =
          meta && typeof meta === "object" && "runId" in meta
            ? (meta as { runId?: string }).runId
            : undefined;
        console.error("[agui]", { event, threadId, runId, meta });
      },
    },
    onError: (error: Error) => {
      setRuntimeError(
        isConnectionError(error) ? CONNECTION_FAILED : STREAM_INTERRUPTED,
      );
    },
  });

  const clearRuntimeError = useCallback(() => {
    setRuntimeError(null);
  }, []);

  return (
    <AgUiErrorContext.Provider value={{ runtimeError, clearRuntimeError }}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AgUiErrorContext.Provider>
  );
}
