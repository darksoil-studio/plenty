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

import { AvailableProducts } from "../../../../ui/src/plenty/orders/types.js";
import { sampleAvailableProducts } from "../../../../ui/src/plenty/orders/mocks.js";
import { sampleProducer } from "../../../../ui/src/plenty/producers/mocks.js";
import { setup } from "../../setup.js";
import { orderManagerRoleConfig } from "../../../../ui/src/roles.js";

test("create AvailableProducts", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );

    // Alice creates a AvailableProducts
    const availableProducts: EntryRecord<AvailableProducts> =
      await alice.orders.client.createAvailableProducts(
        await sampleAvailableProducts(
          alice.orders.client,
          producer.actionHash,
          producer.actionHash,
        ),
      );
    assert.ok(availableProducts);
  });
});

test("create and read AvailableProducts", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );
    const sample = await sampleAvailableProducts(
      alice.orders.client,
      producer.actionHash,
      producer.actionHash,
    );

    // Alice creates a AvailableProducts
    const availableProducts: EntryRecord<AvailableProducts> =
      await alice.orders.client.createAvailableProducts(sample);
    assert.ok(availableProducts);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the created AvailableProducts
    const createReadOutput: EntryRecord<AvailableProducts> = await toPromise(
      bob.orders.availableProducts.get(availableProducts.actionHash).original,
    );
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test("create and update AvailableProducts", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );
    // Alice creates a AvailableProducts
    const availableProducts: EntryRecord<AvailableProducts> =
      await alice.orders.client.createAvailableProducts(
        await sampleAvailableProducts(
          alice.orders.client,
          producer.actionHash,
          producer.actionHash,
        ),
      );
    assert.ok(availableProducts);

    const originalActionHash = availableProducts.actionHash;

    // Alice updates the AvailableProducts
    let contentUpdate = await sampleAvailableProducts(
      alice.orders.client,
      producer.actionHash,
      producer.actionHash,
      { order_hash: availableProducts.entry.order_hash },
    );

    let updatedAvailableProducts: EntryRecord<AvailableProducts> =
      await alice.orders.client.updateAvailableProducts(
        originalActionHash,
        originalActionHash,
        contentUpdate,
      );
    assert.ok(updatedAvailableProducts);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated AvailableProducts
    const readUpdatedOutput0: EntryRecord<AvailableProducts> = await toPromise(
      bob.orders.availableProducts.get(availableProducts.actionHash)
        .latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput0.entry),
    );

    // Alice updates the AvailableProducts again
    contentUpdate = await sampleAvailableProducts(
      alice.orders.client,
      producer.actionHash,
      producer.actionHash,
      { order_hash: availableProducts.entry.order_hash },
    );

    updatedAvailableProducts =
      await alice.orders.client.updateAvailableProducts(
        originalActionHash,
        updatedAvailableProducts.actionHash,
        contentUpdate,
      );
    assert.ok(updatedAvailableProducts);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated AvailableProducts
    const readUpdatedOutput1: EntryRecord<AvailableProducts> = await toPromise(
      bob.orders.availableProducts.get(originalActionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput1.entry),
    );
  });
});

test("create and delete AvailableProducts", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const producer = await alice.producers.client.createProducer(
      await sampleProducer(alice.producers.client),
    );
    // Alice creates a AvailableProducts
    const availableProducts: EntryRecord<AvailableProducts> =
      await alice.orders.client.createAvailableProducts(
        await sampleAvailableProducts(
          alice.orders.client,
          producer.actionHash,
          producer.actionHash,
        ),
      );
    assert.ok(availableProducts);

    // Alice deletes the AvailableProducts
    const deleteActionHash = await alice.orders.client.deleteAvailableProducts(
      availableProducts.actionHash,
    );
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob tries to get the deleted AvailableProducts
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
      bob.orders.availableProducts.get(availableProducts.actionHash).deletes,
    );
    assert.equal(deletes.length, 1);
  });
});
