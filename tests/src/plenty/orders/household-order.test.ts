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

import { HouseholdOrder } from "../../../../ui/src/plenty/orders/types.js";
import { sampleHouseholdOrder } from "../../../../ui/src/plenty/orders/mocks.js";
import { setup } from "../../setup.js";
import { sampleHousehold } from "../../../../ui/src/plenty/households/mocks.js";
import { orderManagerRoleConfig } from "../../../../ui/src/roles.js";

test("create HouseholdOrder", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    const household = await alice.households.client.createHousehold(
      await sampleHousehold(alice.households.client, {
        name: "My Household",
      }),
    );

    // Alice creates a HouseholdOrder
    const householdOrder: EntryRecord<HouseholdOrder> =
      await alice.orders.client.createHouseholdOrder(
        await sampleHouseholdOrder(alice.orders.client, household.actionHash),
      );
    assert.ok(householdOrder);
  });
});

test("create and read HouseholdOrder", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);
    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const household = await alice.households.client.createHousehold(
      await sampleHousehold(alice.households.client, {
        name: "My Household",
      }),
    );

    const sample = await sampleHouseholdOrder(
      alice.orders.client,
      household.actionHash,
    );

    // Alice creates a HouseholdOrder
    const householdOrder: EntryRecord<HouseholdOrder> =
      await alice.orders.client.createHouseholdOrder(sample);
    assert.ok(householdOrder);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the created HouseholdOrder
    const createReadOutput: EntryRecord<HouseholdOrder> = await toPromise(
      bob.orders.householdOrders.get(householdOrder.actionHash).original,
    );
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test("create and update HouseholdOrder", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const household = await alice.households.client.createHousehold(
      await sampleHousehold(alice.households.client, {
        name: "My Household",
      }),
    );

    // Alice creates a HouseholdOrder
    const householdOrder: EntryRecord<HouseholdOrder> =
      await alice.orders.client.createHouseholdOrder(
        await sampleHouseholdOrder(alice.orders.client, household.actionHash),
      );
    assert.ok(householdOrder);

    const originalActionHash = householdOrder.actionHash;

    // Alice updates the HouseholdOrder
    let contentUpdate = await sampleHouseholdOrder(
      alice.orders.client,
      household.actionHash,
      {
        order_hash: householdOrder.entry.order_hash,
      },
    );

    let updatedHouseholdOrder: EntryRecord<HouseholdOrder> =
      await alice.orders.client.updateHouseholdOrder(
        originalActionHash,
        originalActionHash,
        contentUpdate,
      );
    assert.ok(updatedHouseholdOrder);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated HouseholdOrder
    const readUpdatedOutput0: EntryRecord<HouseholdOrder> = await toPromise(
      bob.orders.householdOrders.get(householdOrder.actionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput0.entry),
    );

    // Alice updates the HouseholdOrder again
    contentUpdate = await sampleHouseholdOrder(
      alice.orders.client,
      household.actionHash,
      {
        order_hash: householdOrder.entry.order_hash,
      },
    );

    updatedHouseholdOrder = await alice.orders.client.updateHouseholdOrder(
      originalActionHash,
      updatedHouseholdOrder.actionHash,
      contentUpdate,
    );
    assert.ok(updatedHouseholdOrder);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated HouseholdOrder
    const readUpdatedOutput1: EntryRecord<HouseholdOrder> = await toPromise(
      bob.orders.householdOrders.get(originalActionHash).latestVersion,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput1.entry),
    );
  });
});

test("create and delete HouseholdOrder", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);
    const household = await alice.households.client.createHousehold(
      await sampleHousehold(alice.households.client, {
        name: "My Household",
      }),
    );

    // Alice creates a HouseholdOrder
    const householdOrder: EntryRecord<HouseholdOrder> =
      await alice.orders.client.createHouseholdOrder(
        await sampleHouseholdOrder(alice.orders.client, household.actionHash),
      );
    assert.ok(householdOrder);

    // Alice deletes the HouseholdOrder
    const deleteActionHash = await alice.orders.client.deleteHouseholdOrder(
      householdOrder.actionHash,
    );
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob tries to get the deleted HouseholdOrder
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
      bob.orders.householdOrders.get(householdOrder.actionHash).deletes,
    );
    assert.equal(deletes.length, 1);
  });
});
