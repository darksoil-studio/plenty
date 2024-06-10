import { Producer } from './types.js';

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
  /** Producer */

  async createProducer(producer: Producer): Promise<EntryRecord<Producer>> {
    const record: Record = await this.callZome('create_producer', producer);
    return new EntryRecord(record);
  }
  
  async getLatestProducer(producerHash: ActionHash): Promise<EntryRecord<Producer> | undefined> {
    const record: Record = await this.callZome('get_latest_producer', producerHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalProducer(producerHash: ActionHash): Promise<EntryRecord<Producer> | undefined> {
    const record: Record = await this.callZome('get_original_producer', producerHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForProducer(producerHash: ActionHash): Promise<Array<EntryRecord<Producer>>> {
    const records: Record[] = await this.callZome('get_all_revisions_for_producer', producerHash);
    return records.map(r => new EntryRecord(r));
  }

  async updateProducer(originalProducerHash: ActionHash, previousProducerHash: ActionHash, updatedProducer: Producer): Promise<EntryRecord<Producer>> {
    const record: Record = await this.callZome('update_producer', {
      original_producer_hash: originalProducerHash,
      previous_producer_hash: previousProducerHash,
      updated_producer: updatedProducer
    });
    return new EntryRecord(record);
  }

  deleteProducer(originalProducerHash: ActionHash): Promise<ActionHash> {
    return this.callZome('delete_producer', originalProducerHash);
  }

  getAllDeletesForProducer(originalProducerHash: ActionHash): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome('get_all_deletes_for_producer', originalProducerHash);
  }

  getOldestDeleteForProducer(originalProducerHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome('get_oldest_delete_for_producer', originalProducerHash);
  }
  
  async getProducersForLiason(liason: AgentPubKey): Promise<Array<Link>> {
    return this.callZome('get_producers_for_liason', liason);
  }

  async getDeletedProducersForLiason(liason: AgentPubKey): Promise<Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>> {
    return this.callZome('get_deleted_producers_for_liason', liason);
  }

}
