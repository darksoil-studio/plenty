import { createContext } from '@lit/context';

import { HouseholdsStore } from './households-store.js';

export const householdsStoreContext = createContext<HouseholdsStore>(
  'households/store',
);
