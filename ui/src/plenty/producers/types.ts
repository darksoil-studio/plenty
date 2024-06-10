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

export type ProducersSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
 | ({  type: 'Producer'; } & Producer);

export type LinkTypes = string;


export interface ProducerEditors {
  type:  
    | 'Liason'
        | 'AllMembers'
        | 'Members'
    ;
}
export interface ProducerSorters {
  type:  
    | 'Liason'
        | 'Members'
    ;
}

export interface Producer { 
  name: string;

  photo: EntryHash;

  contact_email: string;

  phone_number: string;

  location: string;

  producer_details: string;

  liason: AgentPubKey;

  editors: ProducerEditors;

  sorters: ProducerSorters;
}

