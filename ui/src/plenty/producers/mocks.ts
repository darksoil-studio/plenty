import { Producer } from './types.js';

import {
  AgentPubKeyMap,
  decodeEntry,
  fakeEntry,
  fakeCreateAction,
  fakeUpdateEntry,
  fakeDeleteEntry,
  fakeRecord,
  pickBy,
  ZomeMock,
  RecordBag,
  entryState,
  HoloHashMap,
  HashType,
  hash
} from "@holochain-open-dev/utils";
import {
  decodeHashFromBase64,
  NewEntryAction,
  AgentPubKey,
  ActionHash,
  EntryHash,
  Delete,
  AppClient,
  fakeAgentPubKey,
  fakeDnaHash,
  Link,
  fakeActionHash,
  SignedActionHashed,
  fakeEntryHash,
  Record,
} from "@holochain/client";
import { ProducersClient } from './producers-client.js'

export class ProducersZomeMock extends ZomeMock implements AppClient {
  constructor(
    myPubKey?: AgentPubKey
  ) {
    super("producers_test", "producers", myPubKey);
  }
  /** Producer */
  producers = new HoloHashMap<ActionHash, {
    deletes: Array<SignedActionHashed<Delete>>;
    revisions: Array<Record>;
  }>();
  producersForLiason = new HoloHashMap<ActionHash, Link[]>();

  async create_producer(producer: Producer): Promise<Record> {
    const entryHash = hash(producer, HashType.ENTRY);
    const record = await fakeRecord(await fakeCreateAction(entryHash), fakeEntry(producer));
    
    this.producers.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record]
    });
  
    const existingLiason = this.producersForLiason.get(producer.liason) || [];
    this.producersForLiason.set(producer.liason, [...existingLiason, { 
      target: record.signed_action.hashed.hash, 
      author: this.myPubKey,
      timestamp: Date.now() * 1000,
      zome_index: 0,
      link_type: 0,
      tag: new Uint8Array(),
      create_link_hash: await fakeActionHash()
    }]);

    return record;
  }
  
  async get_latest_producer(producerHash: ActionHash): Promise<Record | undefined> {
    const producer = this.producers.get(producerHash);
    return producer ? producer.revisions[producer.revisions.length - 1] : undefined;
  }
  
  async get_all_revisions_for_producer(producerHash: ActionHash): Promise<Record[] | undefined> {
    const producer = this.producers.get(producerHash);
    return producer ? producer.revisions : undefined;
  }
  
  async get_original_producer(producerHash: ActionHash): Promise<Record | undefined> {
    const producer = this.producers.get(producerHash);
    return producer ? producer.revisions[0] : undefined;
  }
  
  async get_all_deletes_for_producer(producerHash: ActionHash): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const producer = this.producers.get(producerHash);
    return producer ? producer.deletes : undefined;
  }

  async get_oldest_delete_for_producer(producerHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    const producer = this.producers.get(producerHash);
    return producer ? producer.deletes[0] : undefined;
  }
  async delete_producer(original_producer_hash: ActionHash): Promise<ActionHash> {
    const record = await fakeRecord(await fakeDeleteEntry(original_producer_hash));
    
    this.producers.get(original_producer_hash).deletes.push(record.signed_action as SignedActionHashed<Delete>);
    
    return record.signed_action.hashed.hash;
  }

  async update_producer(input: { original_producer_hash: ActionHash; previous_producer_hash: ActionHash; updated_producer: Producer; }): Promise<Record> {
    const record = await fakeRecord(await fakeUpdateEntry(input.previous_producer_hash, undefined, undefined, fakeEntry(input.updated_producer)), fakeEntry(input.updated_producer));

  this.producers.get(input.original_producer_hash).revisions.push(record);
     
    const producer = input.updated_producer;
    
    const existingLiason = this.producersForLiason.get(producer.liason) || [];
    this.producersForLiason.set(producer.liason, [...existingLiason, {
      target: record.signed_action.hashed.hash, 
      author: record.signed_action.hashed.content.author,
      timestamp: record.signed_action.hashed.content.timestamp,
      zome_index: 0,
      link_type: 0,
      tag: new Uint8Array(),
      create_link_hash: await fakeActionHash()
    }]);
    
    return record;
  }
  
  async get_producers_for_liason(liason: AgentPubKey): Promise<Array<Link>> {
    return this.producersForLiason.get(liason) || [];
  }


}

export async function sampleProducer(client: ProducersClient, partialProducer: Partial<Producer> = {}): Promise<Producer> {
    return {
        ...{
          name: "Lorem ipsum 2",
          photo: (await fakeEntryHash()),
          contact_email: "Lorem ipsum 2",
          phone_number: "Lorem ipsum 2",
          location: "Lorem ipsum 2",
          producer_details: "Lorem ipsum 2",
          liason: client.client.myPubKey,
          editors: { type: 'Liason' },
          sorters: { type: 'Liason' },
        },
        ...partialProducer
    };
}
