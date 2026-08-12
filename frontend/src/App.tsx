import { AgUiRuntimeProvider } from "./providers/AgUiRuntimeProvider";
import { Thread } from "./components/assistant-ui/thread";

export default function App() {
  return (
    <div className="flex min-h-svh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold">Agent Chat App</h1>
        <p className="text-sm text-zinc-500">繁體中文串流對話（v1）</p>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <AgUiRuntimeProvider>
          <Thread />
        </AgUiRuntimeProvider>
      </main>
    </div>
  );
}
