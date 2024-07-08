import { 
  SignedActionHashed,
  CreateLink,
  Link,
  DeleteLink,
  Delete,
  AppClient, 
  Record, 
  ActionHash, 
  EntryHash, 
  AgentPubKey,
} from '@holochain/client';
import { isSignalFromCellWithRole, EntryRecord, ZomeClient } from '@holochain-open-dev/utils';

import { OrdersSignal } from './types.js';

export class OrdersClient extends ZomeClient<OrdersSignal> {

  constructor(public client: AppClient, public roleName: string, public zomeName = 'orders') {
    super(client, roleName, zomeName);
  }
}
