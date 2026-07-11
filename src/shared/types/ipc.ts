export const IPC = {
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    IS_MAXIMIZED: 'window:isMaximized',
    MAXIMIZED: 'window:maximized',
  },
  DIALOG: {
    SELECT_FILES: 'dialog:selectFiles',
  },
  NOTEBOOKS: {
    LIST: 'notebooks:list',
    CREATE: 'notebooks:create',
    RENAME: 'notebooks:rename',
    DELETE: 'notebooks:delete',
    GET_GUIDE: 'notebooks:getGuide',
  },
  SOURCES: {
    LIST: 'sources:list',
    UPLOAD: 'sources:upload',
    DELETE: 'sources:delete',
    GET_CONTENT: 'sources:getContent',
    SET_ACTIVE: 'sources:setActive',
    PROGRESS: 'sources:progress',
  },
  CHAT: {
    SEND: 'chat:send',
    HISTORY: 'chat:history',
    CLEAR: 'chat:clear',
    TOKEN: 'chat:token',
    STOP: 'chat:stop',
  },
  NOTES: {
    GET: 'notes:get',
    SAVE: 'notes:save',
  },
  SETTINGS: {
    GET: 'settings:get',
    UPDATE: 'settings:update',
    GET_AVAILABLE_MODELS: 'settings:getAvailableModels',
    DOWNLOAD_MODEL: 'settings:downloadModel',
    SET_ACTIVE_MODEL: 'settings:setActiveModel',
    DELETE_MODEL: 'settings:deleteModel',
    LIST_OLLAMA_MODELS: 'settings:listOllamaModels',
    SYSTEM_INFO: 'settings:systemInfo',
  },
  OLLAMA: {
    CHECK_INSTALLED: 'ollama:checkInstalled',
    CHECK_RUNNING: 'ollama:checkRunning',
    PULL_MODEL: 'ollama:pullModel',
    PULL_PROGRESS: 'ollama:pullProgress',
    WARMUP: 'ollama:warmup',
    WARMUP_PROGRESS: 'ollama:warmupProgress',
    DOWNLOAD_INSTALL: 'ollama:downloadInstall',
    DOWNLOAD_PROGRESS: 'ollama:downloadProgress',
    START_SERVER: 'ollama:startServer',
    SET_AUTO_START: 'ollama:setAutoStart',
    GET_AUTO_START: 'ollama:getAutoStart',
  },
  SETUP: {
    IS_COMPLETE: 'setup:isComplete',
    SYSTEM_INFO: 'setup:systemInfo',
    DOWNLOAD_MODEL: 'setup:downloadModel',
    COMPLETE: 'setup:complete',
  },
  MODEL: {
    DOWNLOAD_PROGRESS: 'model:downloadProgress',
  },
  SERVER: {
    STATUS: 'server:status',
  },
  WEB_SEARCH: {
    SEARCH: 'web-search:search',
  },
  EXTERNAL: {
    OPEN: 'open-external',
  },
} as const;
