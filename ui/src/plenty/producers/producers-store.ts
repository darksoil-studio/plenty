import { Product } from "./types.js";

import { Producer } from "./types.js";

import {
  collectionSignal,
  liveLinksSignal,
  deletedLinksSignal,
  allRevisionsOfEntrySignal,
  latestVersionOfEntrySignal,
  immutableEntrySignal,
  deletesForEntrySignal,
  pipe,
  AsyncComputed,
  Signal,
  AsyncSignal,
  AsyncState,
} from "@holochain-open-dev/signals";
import {
  slice,
  HashType,
  retype,
  EntryRecord,
  LazyHoloHashMap,
} from "@holochain-open-dev/utils";
import {
  NewEntryAction,
  Record,
  ActionHash,
  EntryHash,
  AgentPubKey,
} from "@holochain/client";

import { ProducersClient } from "./producers-client.js";

export class ProducersStore {
  constructor(public client: ProducersClient) {}

  /** Producer */

  producers = new LazyHoloHashMap((producerHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () =>
      this.client.getLatestProducer(producerHash),
    ),
    original: immutableEntrySignal(() =>
      this.client.getOriginalProducer(producerHash),
    ),
    allRevisions: allRevisionsOfEntrySignal(this.client, () =>
      this.client.getAllRevisionsForProducer(producerHash),
    ),
    deletes: deletesForEntrySignal(this.client, producerHash, () =>
      this.client.getAllDeletesForProducer(producerHash),
    ),
    products: {
      live: pipe(
        liveLinksSignal(
          this.client,
          producerHash,
          () => this.client.getProductsForProducer(producerHash),
          "ProducerToProducts",
        ),
        (links) =>
          slice(
            this.products,
            links.map((l) => l.target),
          ),
      ),
      deleted: pipe(
        deletedLinksSignal(
          this.client,
          producerHash,
          () => this.client.getDeletedProductsForProducer(producerHash),
          "ProducerToProducts",
        ),
        (links) =>
          slice(
            this.products,
            links.map((l) => l[0].hashed.content.target_address),
          ),
      ),
    },
  }));

  canIEdit(producer: EntryRecord<Producer>) {
    const editors = producer.entry.editors;
    if (editors.type === "AllMembers") return true;
    if (editors.type === "Liason")
      return (
        this.client.client.myPubKey.toString() ===
        producer.entry.liason.toString()
      );
    return !!editors.members.find(
      (m) => m.toString() === this.client.client.myPubKey.toString(),
    );
  }

  producersForLiason = new LazyHoloHashMap((liason: AgentPubKey) => ({
    live: pipe(
      liveLinksSignal(
        this.client,
        liason,
        () => this.client.getProducersForLiason(liason),
        "LiasonToProducers",
      ),
      (links) =>
        slice(
          this.producers,
          links.map((l) => l.target),
        ),
    ),
    deleted: pipe(
      deletedLinksSignal(
        this.client,
        liason,
        () => this.client.getDeletedProducersForLiason(liason),
        "LiasonToProducers",
      ),
      (links) =>
        slice(
          this.producers,
          links.map((l) => l[0].hashed.content.target_address),
        ),
    ),
  }));

  /** All Producers */

  allProducers = pipe(
    collectionSignal(
      this.client,
      () => this.client.getAllProducers(),
      "AllProducers",
    ),
    (allProducers) =>
      slice(
        this.producers,
        allProducers.map((l) => l.target),
      ),
  );

  /** Product */

  products = new LazyHoloHashMap((productHash: ActionHash) => {
    return {
      latestVersion: latestVersionOfEntrySignal(this.client, () =>
        this.client.getLatestProduct(productHash),
      ),
      original: immutableEntrySignal(() =>
        this.client.getOriginalProduct(productHash),
      ),
      allRevisions: allRevisionsOfEntrySignal(this.client, () =>
        this.client.getAllRevisionsForProduct(productHash),
      ),
      deletes: deletesForEntrySignal(this.client, productHash, () =>
        this.client.getAllDeletesForProduct(productHash),
      ),
    };
  });

  allCategories = lazyLoadAndPoll(() => this.client.getAllCategories(), 10000);
}

export function lazyLoadAndPoll<T>(
  task: () => Promise<T>,
  intervalMs: number,
): AsyncSignal<T> {
  let watched = false;
  const signal = new AsyncState<T>(
    { status: "pending" },
    {
      [Signal.subtle.watched]: () => {
        watched = true;

        const request = () => {
          if (watched)
            task()
              .then((value) => {
                if (watched)
                  signal.set({
                    status: "completed",
                    value,
                  });
              })
              .catch((error) => {
                if (watched) {
                  signal.set({
                    status: "error",
                    error,
                  });
                }
              })
              .finally(() => {
                if (watched) {
                  setTimeout(() => request(), intervalMs);
                }
              });
        };
        request();
      },
      [Signal.subtle.unwatched]: () => {
        watched = false;
        signal.set({
          status: "pending",
        });
      },
    },
  );
  return signal;
}
