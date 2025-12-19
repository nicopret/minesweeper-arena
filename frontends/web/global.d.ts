/// <reference types="react" />
/// <reference types="react-dom" />

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize?: (options: {
            client_id: string;
            callback: (response: unknown) => void;
          }) => void;
          renderButton?: (parent: HTMLElement, options?: unknown) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

export {};
