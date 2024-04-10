import { 
  SignedActionHashed,
  CreateLink,
  Link,
  DeleteLink,
  Delete,
  AppAgentClient, 
  Record, 
  ActionHash, 
  EntryHash, 
  AgentPubKey,
} from '@holochain/client';
import { isSignalFromCellWithRole, EntryRecord, ZomeClient } from '@holochain-open-dev/utils';

import { HouseholdSignal } from './types.js';

export class HouseholdClient extends ZomeClient<HouseholdSignal> {

  constructor(public client: AppAgentClient, public roleName: string, public zomeName = 'household') {
    super(client, roleName, zomeName);
  }
}
