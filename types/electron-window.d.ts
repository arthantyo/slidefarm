export {};

declare global {
  interface Window {
    slidefarmWindow?: {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<boolean>;
      isMaximized: () => Promise<boolean>;
      close: () => Promise<void>;
      onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
    };
  }
}
