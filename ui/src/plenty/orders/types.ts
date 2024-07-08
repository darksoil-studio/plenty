import { 
  Record, 
  ActionHash, 
  DnaHash,
  SignedActionHashed,
  EntryHash, 
  AgentPubKey,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink
} from '@holochain/client';
import { ActionCommittedSignal } from '@holochain-open-dev/utils';

export type OrdersSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
 | ({  type: 'Order'; } & Order);

export type LinkTypes = string;


export interface OrderStatus {
  type:  
    | 'Preparing'
        | 'Open'
        | 'Closed'
        | 'Processed'
        | 'Finished'
    ;
}

export interface Order { 
  name: string;

  status: OrderStatus;
}

