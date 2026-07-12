# VaultMind — Developer Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│               Main Process (Electron)            │
│                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐│
│  │  Engine   │  │  Handlers    │  │  Database    ││
│  │          │  │  (IPC)       │  │             ││
│  │ ollama   │  │  chat        │  │  sqlite     ││
│  │ embedder │  │  sessions    │  │  settings   ││
│  │ vector   │  │  notebooks   │  │  messages   ││
│  │ store    │  │  sources     │  │  notebooks  ││
│  │ rag-     │  │  settings    │  │  sources    ││
│  │ engine   │  │  ollama      │  │  sessions   ││
│  │ llm      │  │  notes       │  │  notes      ││
│  │ prompts  │  │  setup       │  │             ││
│  │ context- │  └──────┬───────┘  └─────────────┘│
│  │ builder  │         │                          │
│  │ summarizer│         │ contextBridge            │
│  │ web-search│         │ (IPC)                    │
│  └──────────┘         │                          │
├────────────────────────┼──────────────────────────┤
│              Renderer  │                          │
│         ┌──────────────┴───────────────┐          │
│         │  Pages        │  Components   │          │
│         │  NotebookView │  ChatPanel    │          │
│         │  NotebookList │  SourcesPanel │          │
│         │  SetupWizard  │  StudioPanel  │          │
│         │               │  StatusBar    │          │
│         │               │  TitleBar     │          │
│         │               │  CollapseBtn  │          │
│         │               │  SettingsModal│          │
│         ├───────────────┴───────────────┤          │
│         │  Hooks                        │          │
│         │  useChat   useSources         │          │
│         │  useNotebook  useSessions     │          │
│         └───────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### Key directories

| Directory | Purpose |
|---|---|
| `src/main/engine/` | Core RAG engine: Ollama client, embeddings, vector store, prompt templates, context builder, document summariser |
| `src/main/ipc/` | One file per domain — registers `ipcMain.handle(...)` for every IPC channel |
| `src/main/database/` | SQLite initialisation, migrations, and per-entity repositories |
| `src/main/processors/` | File ingestion pipeline (PDF, TXT, MD, CSV → chunks) |
| `src/main/search/` | Web search providers (DuckDuckGo, Google CSE) |
| `src/main/setup/` | First-run wizard and system checks |
| `src/renderer/pages/` | Top-level route-like page components |
| `src/renderer/components/` | UI components organised by feature domain |
| `src/renderer/hooks/` | React hooks that wrap IPC calls |
| `src/shared/` | Types, constants, logger — used by both processes |

## How to add a new feature

### 1. New IPC channel

1. Add the channel name in `src/shared/types/ipc.ts` (the `IPC` const).
2. Create or extend a handler in `src/main/ipc/` and call `ipcMain.handle(...)`.
3. Register the handler in `src/main/ipc/index.ts` (if new file).
4. Expose the channel in the preload script (`build/preload.js` or wherever `contextBridge.exposeInMainWorld` lives).
5. Call it from a React hook or component via `window.vaultmind.<domain>.<method>()`.

### 2. New LLM model

1. Add the model to `OLLAMA_PRESETS` in `src/shared/constants.ts`.
2. The Settings modal will pick it up automatically.

### 3. New file processor

1. Create `src/main/processors/<type>-processor.ts` with a function that returns `Array<{ pageNum: number; text: string }>`.
2. Add the extension to `SUPPORTED_FILE_EXTENSIONS` in constants.
3. Wire it into `src/main/processors/index.ts` (the `processFile` switch).

### 4. New renderer panel

1. Create a directory under `src/renderer/components/`.
2. Add a hook under `src/renderer/hooks/` if IPC calls are needed.
3. Wire it into `NotebookView.tsx` as a collapsible panel.

## Data flow for a chat message

```
User types message
       │
       ▼
ChatPanel.jsx  ─── onSend(text) ───▶  useChat.sendMessage(text)
       │                                       │
       │                              window.vaultmind.chat.send(...)
       │                                       │
       │                                       ▼
       │                              chat.handler.ts  (main process)
       │                                       │
       │                              addUserMessage(...)  (DB)
       │                              streamChat(...)
       │                                ├── searchSimilar (vector store)
       │                                ├── generateSearchQuery (LLM)
       │                                ├── searchWeb (optional)
       │                                ├── buildContext
       │                                ├── getSystemPrompt
       │                                └── generateStream (LLM)
       │                                       │
       │                              IPC.CHAT.TOKEN events sent back
       │                                       │
       │                              addAssistantMessage(...)  (DB)
       │                                       │
       ▼                                       ▼
streamingContent updated ←──── token received
       │
       ▼
MessageBubble renders partial response
```

## Conventions

- **File naming**: `kebab-case` for files, `camelCase` for functions/variables, `PascalCase` for types/components.
- **IPC channels**: Defined in `src/shared/types/ipc.ts` as a `const` object. Prefix by domain (e.g. `CHAT.SEND`, `SOURCES.UPLOAD`).
- **Error handling**: Catch clauses use `err instanceof Error ? err.message : String(err)` — never cast with `as Error`.
- **DB access**: All access goes through `dbRun` / `dbGet` / `dbAll` in `sqlite.ts`. No direct `better-sqlite3` calls outside repository files.
- **Async I/O**: Use `fs/promises` (not `readFileSync` etc.) in all code paths that can be async.
- **Logging**: Use `logger.info/warn/error` from `src/shared/logger.ts`. The logger handles EPIPE suppression in packaged builds.
- **Testing**: Vitest with jsdom, `@testing-library/react` for hooks, and `@testing-library/jest-dom` for DOM assertions. Run via `npm test`.

## Build commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Electron with hot reload |
| `npm run build` | Build renderer + package Electron app |
| `npm run dev:main` | Compile main process TypeScript |
| `npm run dev:renderer` | Start Vite dev server on port 5173 |
| `npx tsc --noEmit --project tsconfig.main.json` | Type-check main process |
| `npx tsc --noEmit --project tsconfig.json` | Type-check renderer + shared |
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Environment

- **Runtime**: Electron (Chromium + Node.js)
- **Language**: TypeScript (main + renderer), JSX (some legacy components)
- **UI**: React (no framework — plain `createRoot`)
- **Build**: Vite (renderer), tsc (main)
- **DB**: better-sqlite3 (synchronous, WAL mode)
- **Vector store**: LanceDB (ANN search over embeddings)
- **Embeddings**: fastembed (FlagEmbedding, local inference)
- **LLM backend**: Ollama (REST API at `http://127.0.0.1:11434`)
