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

import { ProducerInvoice } from "../../../../ui/src/plenty/orders/types.js";
import { sampleProducerInvoice } from "../../../../ui/src/plenty/orders/mocks.js";
import {
  bookkeeperRoleConfig,
  orderManagerRoleConfig,
} from "../../../../ui/src/roles.js";
import { sampleProducer } from "../../../../ui/src/plenty/producers/mocks.js";
import { setup } from "../../setup.js";

test("create ProducerInvoice", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    await alice.roles.client.assignRole(bookkeeperRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> =
      await alice.orders.client.createProducerInvoice(
        await sampleProducerInvoice(alice.orders.client, producer.actionHash),
      );
    assert.ok(producerInvoice);
  });
});

test("create and read ProducerInvoice", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    await alice.roles.client.assignRole(bookkeeperRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    const sample = await sampleProducerInvoice(
      alice.orders.client,
      producer.actionHash,
    );

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> =
      await alice.orders.client.createProducerInvoice(sample);
    assert.ok(producerInvoice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the created ProducerInvoice
    const createReadOutput: EntryRecord<ProducerInvoice> = await toPromise(
      bob.orders.producerInvoices.get(producerInvoice.actionHash).original,
    );
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test("create and update ProducerInvoice", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    await alice.roles.client.assignRole(bookkeeperRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> =
      await alice.orders.client.createProducerInvoice(
        await sampleProducerInvoice(alice.orders.client, producer.actionHash),
      );
    assert.ok(producerInvoice);

    const originalActionHash = producerInvoice.actionHash;

    // Alice updates the ProducerInvoice
    let contentUpdate = await sampleProducerInvoice(
      alice.orders.client,
      producer.actionHash,
      { order_hash: producerInvoice.entry.order_hash },
    );

    let updatedProducerInvoice: EntryRecord<ProducerInvoice> =
      await alice.orders.client.updateProducerInvoice(
        originalActionHash,
        contentUpdate,
      );
    assert.ok(updatedProducerInvoice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated ProducerInvoice
    const readUpdatedOutput0: EntryRecord<ProducerInvoice> = await toPromise(
      bob.orders.producerInvoices.get(producerInvoice.actionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput0.entry),
    );

    // Alice updates the ProducerInvoice again
    contentUpdate = await sampleProducerInvoice(
      alice.orders.client,
      producer.actionHash,
      { order_hash: producerInvoice.entry.order_hash },
    );

    updatedProducerInvoice = await alice.orders.client.updateProducerInvoice(
      updatedProducerInvoice.actionHash,
      contentUpdate,
    );
    assert.ok(updatedProducerInvoice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated ProducerInvoice
    const readUpdatedOutput1: EntryRecord<ProducerInvoice> = await toPromise(
      bob.orders.producerInvoices.get(originalActionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput1.entry),
    );
  });
});

test("create and delete ProducerInvoice", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    await alice.roles.client.assignRole(bookkeeperRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a ProducerInvoice
    const producerInvoice: EntryRecord<ProducerInvoice> =
      await alice.orders.client.createProducerInvoice(
        await sampleProducerInvoice(alice.orders.client, producer.actionHash),
      );
    assert.ok(producerInvoice);

    // Alice deletes the ProducerInvoice
    const deleteActionHash = await alice.orders.client.deleteProducerInvoice(
      producerInvoice.actionHash,
    );
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob tries to get the deleted ProducerInvoice
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
      bob.orders.producerInvoices.get(producerInvoice.actionHash).deletes,
    );
    assert.equal(deletes.length, 1);
  });
});
