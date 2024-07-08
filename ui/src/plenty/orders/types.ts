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
 | ({ type: 'ProducerDelivery'; } & ProducerDelivery)
 | ({ type: 'HouseholdOrder'; } & HouseholdOrder)
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




export interface HouseholdOrder { 
  order_hash: ActionHash;

  products: Array<ActionHash>;
}




export interface ProducerDelivery { 
  order_hash: ActionHash;

  products: Array<ActionHash>;
}

