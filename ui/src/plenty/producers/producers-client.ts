import { Product } from "./types.js";

import { Producer } from "./types.js";

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
} from "@holochain/client";
import {
  isSignalFromCellWithRole,
  EntryRecord,
  ZomeClient,
} from "@holochain-open-dev/utils";

import { ProducersSignal } from "./types.js";

export class ProducersClient extends ZomeClient<ProducersSignal> {
  constructor(
    public client: AppClient,
    public roleName: string,
    public zomeName = "producers",
  ) {
    super(client, roleName, zomeName);
  }
  /** Producer */

  async createProducer(producer: Producer): Promise<EntryRecord<Producer>> {
    const record: Record = await this.callZome("create_producer", producer);
    return new EntryRecord(record);
  }

  async getLatestProducer(
    producerHash: ActionHash,
  ): Promise<EntryRecord<Producer> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_producer",
      producerHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalProducer(
    producerHash: ActionHash,
  ): Promise<EntryRecord<Producer> | undefined> {
    const record: Record = await this.callZome(
      "get_original_producer",
      producerHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForProducer(
    producerHash: ActionHash,
  ): Promise<Array<EntryRecord<Producer>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_producer",
      producerHash,
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateProducer(
    originalProducerHash: ActionHash,
    previousProducerHash: ActionHash,
    updatedProducer: Producer,
  ): Promise<EntryRecord<Producer>> {
    const record: Record = await this.callZome("update_producer", {
      original_producer_hash: originalProducerHash,
      previous_producer_hash: previousProducerHash,
      updated_producer: updatedProducer,
    });
    return new EntryRecord(record);
  }

  deleteProducer(originalProducerHash: ActionHash): Promise<ActionHash> {
    return this.callZome("delete_producer", originalProducerHash);
  }

  getAllDeletesForProducer(
    originalProducerHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome("get_all_deletes_for_producer", originalProducerHash);
  }

  getOldestDeleteForProducer(
    originalProducerHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome(
      "get_oldest_delete_for_producer",
      originalProducerHash,
    );
  }

  async getProducersForLiason(liason: AgentPubKey): Promise<Array<Link>> {
    return this.callZome("get_producers_for_liason", liason);
  }

  async getDeletedProducersForLiason(
    liason: AgentPubKey,
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_producers_for_liason", liason);
  }

  /** All Producers */

  async getAllProducers(): Promise<Array<Link>> {
    return this.callZome("get_all_producers", undefined);
  }
  /** Product */

  async createProduct(product: Product): Promise<EntryRecord<Product>> {
    const record: Record = await this.callZome("create_product", product);
    return new EntryRecord(record);
  }

  async getLatestProduct(
    productHash: ActionHash,
  ): Promise<EntryRecord<Product> | undefined> {
    const record: Record = await this.callZome(
      "get_latest_product",
      productHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalProduct(
    productHash: ActionHash,
  ): Promise<EntryRecord<Product> | undefined> {
    const record: Record = await this.callZome(
      "get_original_product",
      productHash,
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForProduct(
    productHash: ActionHash,
  ): Promise<Array<EntryRecord<Product>>> {
    const records: Record[] = await this.callZome(
      "get_all_revisions_for_product",
      productHash,
    );
    return records.map((r) => new EntryRecord(r));
  }

  async updateProduct(
    originalProductHash: ActionHash,
    previousProductHash: ActionHash,
    updatedProduct: Product,
  ): Promise<EntryRecord<Product>> {
    const record: Record = await this.callZome("update_product", {
      original_product_hash: originalProductHash,
      previous_product_hash: previousProductHash,
      updated_product: updatedProduct,
    });
    return new EntryRecord(record);
  }

  deleteProduct(originalProductHash: ActionHash): Promise<ActionHash> {
    return this.callZome("delete_product", originalProductHash);
  }

  getAllDeletesForProduct(
    originalProductHash: ActionHash,
  ): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome("get_all_deletes_for_product", originalProductHash);
  }

  getOldestDeleteForProduct(
    originalProductHash: ActionHash,
  ): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome("get_oldest_delete_for_product", originalProductHash);
  }

  async getProductsForProducer(producerHash: ActionHash): Promise<Array<Link>> {
    return this.callZome("get_products_for_producer", producerHash);
  }

  async getDeletedProductsForProducer(
    producerHash: ActionHash,
  ): Promise<
    Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
  > {
    return this.callZome("get_deleted_products_for_producer", producerHash);
  }

  /** Categories */

  async getAllCategories(): Promise<Array<String>> {
    return this.callZome("get_all_categories", null);
  }

  async getProductsForCategory(category: String): Promise<Array<Link>> {
    return this.callZome("get_products_for_category", category);
  }
}
