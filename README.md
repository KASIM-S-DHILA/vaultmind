# VaultMind

Private AI assistant for legal and confidential document work.
100% offline. No data ever leaves your device.

## Features

- **Fully offline** — No cloud API, no telemetry, no internet required after setup
- **PDF, text & audio** — Upload contracts, notes, and meeting recordings
- **Source-grounded answers** — Every response cites its sources
- **Swappable models** — Switch between Phi-4 Mini, Llama 3.2, Qwen3, and any GGUF model
- **NotebookLM-style UI** — Three-panel layout: Sources, Chat, Studio
- **Audio transcription** — Local Whisper transcription for meeting recordings

## Requirements

| Spec | Minimum | Recommended |
|------|---------|-------------|
| OS | Windows 10/11 | Windows 11 |
| RAM | 8 GB | 16 GB |
| Disk | 5 GB | 10 GB |
| CPU | Intel i5 / Ryzen 5 | Intel i7 / Ryzen 7 |
| GPU | Not required | NVIDIA (optional, faster) |

## Installation

Download `VaultMind-Setup-1.0.0.exe` from the [releases page](https://github.com/KASIM-S-DHILA/vaultmind/releases) and run the installer. On first launch, the app will guide you through downloading the AI models (~2.5 GB). After setup, VaultMind works entirely offline.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com) (installed automatically in production builds)

### Setup

```bash
git clone https://github.com/KASIM-S-DHILA/vaultmind.git
cd vaultmind
npm install
```

### Run

```bash
npm run dev
```

Launches the Vite dev server and Electron with hot reload.

### Build installer

```bash
npm run build
```

Output: `release/VaultMind-Setup-X.X.X.exe`.

### Test

```bash
npm test
```

## Project structure

```
src/
├── main/           # Electron main process
│   ├── engine/     # LLM client, embeddings, vector store, RAG pipeline
│   ├── ipc/        # IPC handlers (one file per domain)
│   ├── database/   # SQLite schema, migrations, repositories
│   ├── processors/ # File ingestion: PDF, text, audio
│   ├── search/     # Web search providers (DuckDuckGo, Google CSE)
│   └── setup/      # First-run wizard, system checks
├── renderer/       # React frontend
│   ├── pages/      # SetupWizard, NotebookList, NotebookView
│   ├── components/ # SourcesPanel, ChatPanel, StudioPanel, SettingsModal
│   └── hooks/      # useChat, useSources, useNotebook, useSessions
├── shared/         # Types, constants, logger (used by both processes)
└── tests/          # Vitest test suite
```

## Changing models

Open **Settings** (gear icon in the top bar) and go to the **Models** tab:

- **Switch**: Click "Use This" next to any downloaded model
- **Download**: Click download for preset models (Phi-4 Mini, Llama 3.2, Qwen3, Whisper variants)
- **Custom**: Paste any Hugging Face GGUF URL to download
- **Delete**: Remove models you no longer need

The model switch takes effect immediately — no restart required.

## Data privacy

All data is stored locally at `%APPDATA%\VaultMind\`:

- `models/` — Downloaded AI models
- `data/vectors/` — LanceDB vector embeddings
- `vaultmind.db` — SQLite metadata (notebooks, sources, chat history, notes)

No data is ever sent to any server. VaultMind makes no network requests during normal operation.

## License

MIT — see [LICENSE.md](LICENSE.md).
