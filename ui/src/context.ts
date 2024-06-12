import { Router } from "@holochain-open-dev/elements";
import { createContext } from "@lit/context";

export const routerContext = createContext<Router>("router");
