import { createContext } from '@lit/context';
import { ProducersStore } from './producers-store.js';

export const producersStoreContext = createContext<ProducersStore>(
  'producers/store'
);

