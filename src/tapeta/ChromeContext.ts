import { createContext, useContext } from "react";
import type { LocalSession } from "../lib/session";

export type NavKey = "explore" | "my" | "komunitas";

export interface ChromeAccount {
  signedIn: boolean;
  initials: string;
  unreadCount: number;
  accountMenuOpen: boolean;
  notificationOpen: boolean;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
  onOpenNotifications: () => void;
  onSignOut: () => void;
  onSessionUpdated: (session: LocalSession) => void;
}

export interface ChromeContextValue {
  navigate: (key: NavKey) => void;
  account: ChromeAccount;
  openHome: () => void;
}

const NOOP = () => undefined;

const FALLBACK: ChromeContextValue = {
  navigate: NOOP,
  openHome: NOOP,
  account: {
    signedIn: false,
    initials: "?",
    unreadCount: 0,
    accountMenuOpen: false,
    notificationOpen: false,
    onOpenAuth: NOOP,
    onOpenAccount: NOOP,
    onOpenNotifications: NOOP,
    onSignOut: NOOP,
    onSessionUpdated: NOOP,
  },
};

export const ChromeContext = createContext<ChromeContextValue>(FALLBACK);

export function useChrome(): ChromeContextValue {
  return useContext(ChromeContext);
}
