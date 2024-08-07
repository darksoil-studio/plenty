import { assert, test } from "vitest";

import { runScenario, dhtSync } from "@holochain/tryorama";
import {
  ActionHash,
  SignedActionHashed,
  Delete,
  Record,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { EntryRecord } from "@holochain-open-dev/utils";
import { cleanNodeDecoding } from "@holochain-open-dev/utils/dist/clean-node-decoding.js";
import { toPromise } from "@holochain-open-dev/signals";

import { ProducerDelivery } from "../../../../ui/src/plenty/orders/types.js";
import { sampleProducerDelivery } from "../../../../ui/src/plenty/orders/mocks.js";
import { setup } from "../../setup.js";
import { orderManagerRoleConfig } from "../../../../ui/src/roles.js";
import { sampleProducer } from "../../../../ui/src/plenty/producers/mocks.js";

test("create ProducerDelivery", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a ProducerDelivery
    const producerDelivery: EntryRecord<ProducerDelivery> =
      await alice.orders.client.createProducerDelivery(
        await sampleProducerDelivery(alice.orders.client, producer.actionHash),
      );
    assert.ok(producerDelivery);
  });
});

test("create and read ProducerDelivery", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    const sample = await sampleProducerDelivery(
      alice.orders.client,
      producer.actionHash,
    );

    // Alice creates a ProducerDelivery
    const producerDelivery: EntryRecord<ProducerDelivery> =
      await alice.orders.client.createProducerDelivery(sample);
    assert.ok(producerDelivery);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the created ProducerDelivery
    const createReadOutput: EntryRecord<ProducerDelivery> = await toPromise(
      bob.orders.producerDeliveries.get(producerDelivery.actionHash).original,
    );
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test("create and update ProducerDelivery", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a ProducerDelivery
    const producerDelivery: EntryRecord<ProducerDelivery> =
      await alice.orders.client.createProducerDelivery(
        await sampleProducerDelivery(alice.orders.client, producer.actionHash),
      );
    assert.ok(producerDelivery);

    const originalActionHash = producerDelivery.actionHash;

    // Alice updates the ProducerDelivery
    let contentUpdate = await sampleProducerDelivery(
      alice.orders.client,
      producer.actionHash,
      {
        order_hash: producerDelivery.entry.order_hash,
        producer_hash: producerDelivery.entry.producer_hash,
      },
    );

    let updatedProducerDelivery: EntryRecord<ProducerDelivery> =
      await alice.orders.client.updateProducerDelivery(
        originalActionHash,
        contentUpdate,
      );
    assert.ok(updatedProducerDelivery);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated ProducerDelivery
    const readUpdatedOutput0: EntryRecord<ProducerDelivery> = await toPromise(
      bob.orders.producerDeliveries.get(producerDelivery.actionHash)
        .latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput0.entry),
    );

    // Alice updates the ProducerDelivery again
    contentUpdate = await sampleProducerDelivery(
      alice.orders.client,
      producer.actionHash,
      {
        order_hash: producerDelivery.entry.order_hash,
        producer_hash: producerDelivery.entry.producer_hash,
      },
    );

    updatedProducerDelivery = await alice.orders.client.updateProducerDelivery(
      updatedProducerDelivery.actionHash,
      contentUpdate,
    );
    assert.ok(updatedProducerDelivery);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated ProducerDelivery
    const readUpdatedOutput1: EntryRecord<ProducerDelivery> = await toPromise(
      bob.orders.producerDeliveries.get(originalActionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput1.entry),
    );
  });
});

test("create and delete ProducerDelivery", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a ProducerDelivery
    const producerDelivery: EntryRecord<ProducerDelivery> =
      await alice.orders.client.createProducerDelivery(
        await sampleProducerDelivery(alice.orders.client, producer.actionHash),
      );
    assert.ok(producerDelivery);

    // Alice deletes the ProducerDelivery
    const deleteActionHash = await alice.orders.client.deleteProducerDelivery(
      producerDelivery.actionHash,
    );
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob tries to get the deleted ProducerDelivery
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
      bob.orders.producerDeliveries.get(producerDelivery.actionHash).deletes,
    );
    assert.equal(deletes.length, 1);
  });
});
