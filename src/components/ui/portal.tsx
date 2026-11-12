import { createContext, useContext } from "react";
/** Radix portal phải render bên trong shadow root, nếu không sẽ mất style. */
export const PortalCtx = createContext<HTMLElement | null>(null);
export const usePortal = () => useContext(PortalCtx) ?? undefined;
