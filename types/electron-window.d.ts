export {};

declare global {
  interface Window {
    slidefarmWindow?: {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<boolean>;
      isMaximized: () => Promise<boolean>;
      close: () => Promise<void>;
      connectTikTok: () => Promise<void>;
      onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
    };
  }
}
