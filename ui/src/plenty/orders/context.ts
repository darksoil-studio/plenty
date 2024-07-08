import { createContext } from '@lit/context';
import { OrdersStore } from './orders-store.js';

export const ordersStoreContext = createContext<OrdersStore>(
  'orders/store'
);

