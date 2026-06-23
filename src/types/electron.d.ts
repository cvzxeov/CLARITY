export {};

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>;
      startSorting: (folderPath: string, recursive: boolean, fallbackName?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      getCategories: () => Promise<Record<string, string[]>>;
      updateCategories: (newCategories: Record<string, string[]>) => Promise<{ success: boolean; error?: string }>;
      getFolderStats: (folderPath: string, recursive: boolean, fallbackName?: string) => Promise<{
        success: boolean;
        stats?: Record<string, number>;
        totalFiles?: number;
        totalSize?: number;
        error?: string;
      }>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      
      // System Utilities IPC hooks
      getRamUsage: () => Promise<{ success: boolean; free: number; total: number; percent: number; error?: string }>;
      purgeRam: () => Promise<{ success: boolean; error?: string }>;
      findDuplicates: (folderPath: string) => Promise<{ success: boolean; groups?: Record<string, Array<{ path: string; name: string; size: number }>>; error?: string }>;
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      scanSystemTrash: () => Promise<{ success: boolean; size: number; error?: string }>;
      cleanSystemTrash: () => Promise<{ success: boolean; error?: string }>;
      purgeEmptyFolders: (folderPath: string) => Promise<{ success: boolean; count: number; error?: string }>;
      getLargeFiles: (folderPath: string) => Promise<{ success: boolean; files?: Array<{ path: string; name: string; size: number }>; error?: string }>;
      getStartupApps: () => Promise<{ success: boolean; apps?: Array<{ name: string; path: string; enabled: boolean }>; error?: string }>;
      toggleStartupApp: (name: string, path: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      readClipboard: () => Promise<string>;

      onSortProgress: (callback: (data: { total: number; processed: number; log: string }) => void) => () => void;
    };
  }
}
