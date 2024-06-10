import { Producer } from './types.js';

import { 
  collectionSignal, 
  liveLinksSignal, 
  deletedLinksSignal, 
  allRevisionsOfEntrySignal,
  latestVersionOfEntrySignal, 
  immutableEntrySignal, 
  deletesForEntrySignal,
  pipe,
  AsyncComputed
} from "@holochain-open-dev/signals";
import { slice, HashType, retype, EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { NewEntryAction, Record, ActionHash, EntryHash, AgentPubKey } from '@holochain/client';

import { ProducersClient } from './producers-client.js';

export class ProducersStore {
  constructor(public client: ProducersClient) {}
  
  /** Producer */

  producers = new LazyHoloHashMap((producerHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () => this.client.getLatestProducer(producerHash)),
    original: immutableEntrySignal(() => this.client.getOriginalProducer(producerHash)),
    allRevisions: allRevisionsOfEntrySignal(this.client, () => this.client.getAllRevisionsForProducer(producerHash)),
    deletes: deletesForEntrySignal(this.client, producerHash, () => this.client.getAllDeletesForProducer(producerHash)),
  }));

  producersForLiason = new LazyHoloHashMap((liason: AgentPubKey) => ({
      live: pipe(
        liveLinksSignal(
          this.client,
          liason,
          () => this.client.getProducersForLiason(liason),
          'LiasonToProducers'
        ), links => slice(this.producers, links.map(l => l.target))
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          liason,
          () => this.client.getDeletedProducersForLiason(liason),
          'LiasonToProducers'
        ), links=> slice(this.producers, links.map(l => l[0].hashed.content.target_address))
      ),
  }));
  
  /** All Producers */

  allProducers = pipe(
    collectionSignal(
      this.client, 
      () => this.client.getAllProducers(),
      'AllProducers'
    ),
    allProducers => slice(this.producers, allProducers.map(l => l.target))
  );
}
