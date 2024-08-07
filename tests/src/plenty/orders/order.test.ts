import { assert, test } from "vitest";

import { runScenario, dhtSync, pause } from "@holochain/tryorama";
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

import { Order } from "../../../../ui/src/plenty/orders/types.js";
import { sampleOrder } from "../../../../ui/src/plenty/orders/mocks.js";
import { setup } from "../../setup.js";
import { orderManagerRoleConfig } from "../../../../ui/src/roles.js";

test("create Order", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    // Alice creates a Order
    const order: EntryRecord<Order> = await alice.orders.client.createOrder(
      await sampleOrder(alice.orders.client),
    );
    assert.ok(order);
  });
});

test("create and read Order", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    const sample = await sampleOrder(alice.orders.client);

    // Alice creates a Order
    const order: EntryRecord<Order> =
      await alice.orders.client.createOrder(sample);
    assert.ok(order);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the created Order
    const createReadOutput: EntryRecord<Order> = await toPromise(
      bob.orders.orders.get(order.actionHash).original,
    );
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test("create and update Order", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    // Alice creates a Order
    const order: EntryRecord<Order> = await alice.orders.client.createOrder(
      await sampleOrder(alice.orders.client),
    );
    assert.ok(order);

    const originalActionHash = order.actionHash;

    // Alice updates the Order
    let contentUpdate = await sampleOrder(alice.orders.client);

    let updatedOrder: EntryRecord<Order> =
      await alice.orders.client.updateOrder(
        originalActionHash,
        originalActionHash,
        contentUpdate,
      );
    assert.ok(updatedOrder);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated Order
    const readUpdatedOutput0: EntryRecord<Order> = await toPromise(
      bob.orders.orders.get(order.actionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput0.entry),
    );

    // Alice updates the Order again
    contentUpdate = await sampleOrder(alice.orders.client);

    updatedOrder = await alice.orders.client.updateOrder(
      originalActionHash,
      updatedOrder.actionHash,
      contentUpdate,
    );
    assert.ok(updatedOrder);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated Order
    const readUpdatedOutput1: EntryRecord<Order> = await toPromise(
      bob.orders.orders.get(originalActionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput1.entry),
    );
  });
});

test("create and delete Order", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    // Alice creates a Order
    const order: EntryRecord<Order> = await alice.orders.client.createOrder(
      await sampleOrder(alice.orders.client),
    );
    assert.ok(order);

    // Alice deletes the Order
    const deleteActionHash = await alice.orders.client.deleteOrder(
      order.actionHash,
    );
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob tries to get the deleted Order
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
      bob.orders.orders.get(order.actionHash).deletes,
    );
    assert.equal(deletes.length, 1);
  });
});
