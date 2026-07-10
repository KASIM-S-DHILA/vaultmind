# VaultMind — Local AI for Legal & Confidential Intelligence

> 100% offline, open-source RAG assistant for legal teams and professionals.
> Process PDFs, documents, and meeting recordings with AI — no data ever leaves your device.

---

## Features

- 🔒 **Fully Offline** — No cloud API, no telemetry, no internet required after setup
- 📄 **PDF, Text & Audio** — Upload contracts, notes, and meeting recordings
- ⚖️ **Legal-Grade AI** — Source-grounded answers with inline citations
- 🔄 **Swappable Models** — Switch between Phi-4 Mini, Llama 3.2, Qwen3, and any GGUF model
- 📋 **NotebookLM-Style UI** — Three-panel layout: Sources · Chat · Studio
- 🎙️ **Audio Transcription** — Local Whisper transcription for meeting recordings

---

## Requirements

| Spec | Minimum | Recommended |
|---|---|---|
| OS | Windows 10/11 | Windows 11 |
| RAM | 8 GB | 16 GB |
| Disk | 5 GB | 10 GB |
| CPU | Intel i5 / Ryzen 5 | Intel i7 / Ryzen 7 |
| GPU | Not required | NVIDIA (optional, faster) |

---

## Installation (End Users)

1. Download `VaultMind-Setup-X.X.X.exe` from the releases page
2. Run the installer — follow the wizard
3. On first launch, VaultMind will guide you through downloading the AI models (~2.5 GB)
4. After setup, VaultMind works 100% offline

---

## Development Setup & Sharing Code

Instead of building a final installer for testing, you can share the raw source code folder. Multiple users/developers can test simultaneously or independently without overlapping each other's local configurations.

### 1. Install Node.js
Both users/developers must install [Node.js](https://nodejs.org/) (18+) on their laptops.

### 2. Share the Code
Share the project folder (excluding the `node_modules` and `models` folders to save size) via a GitHub repository, Google Drive, or a flash drive.

### 3. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 4. Run the App
To instantly launch the application directly from the source code, run:
```bash
npm start
```
*(You can also use `npx electron .` or `npm run dev`)*

### 5. Update in Real-Time
When code changes are made, you only need to close the application window and re-run `npm start` to see the updates instantly.

---

### Build Installer
If you want to compile a production installer:
```bash
npm run build
```
Creates `release/VaultMind-Setup-X.X.X.exe`.

---

## Project Structure

```
rag/
├── src/
│   ├── main/           # Electron main process (backend)
│   │   ├── engine/     # LLM, embedder, vector store, RAG
│   │   ├── processors/ # PDF, text, audio processors
│   │   ├── database/   # SQLite (metadata)
│   │   └── setup/      # Model download, system check
│   └── renderer/       # React frontend (UI)
│       ├── pages/      # SetupWizard, NotebookList, NotebookView
│       ├── components/ # SourcesPanel, ChatPanel, StudioPanel
│       └── hooks/      # useChat, useSources, useNotebook
├── build/              # Installer assets + splash screen
├── models/             # Downloaded models (gitignored)
└── package.json
```

---

## Changing Models

Open **Settings** (⚙ icon in the top bar) → **Models** tab:

- **Switch**: Click "Use This" next to any downloaded model
- **Download**: Click "⬇ Download" for preset models (Phi-4 Mini, Llama 3.2, Qwen3, Whisper variants)
- **Custom**: Paste any Hugging Face GGUF URL and download it
- **Delete**: Remove models you no longer need (can't delete the currently active model)

The model switch takes effect immediately — no restart required.

---

## Data Privacy

All data is stored locally in `%APPDATA%\VaultMind\`:
- `models/` — Downloaded AI models
- `data/vectors/` — LanceDB vector embeddings
- `vaultmind.db` — SQLite metadata (notebooks, sources, chat history, notes)

No data is ever sent to any server. VaultMind makes no network requests during normal operation.

---

## License

MIT License — see [LICENSE.md](LICENSE.md)
