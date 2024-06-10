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

import { ProducersSignal } from './types.js';

export class ProducersClient extends ZomeClient<ProducersSignal> {

  constructor(public client: AppClient, public roleName: string, public zomeName = 'producers') {
    super(client, roleName, zomeName);
  }
}
