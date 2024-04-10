import { createContext } from '@lit/context';
import { HouseholdStore } from './household-store.js';

export const householdStoreContext = createContext<HouseholdStore>(
  'hc_zome_household/store'
);

