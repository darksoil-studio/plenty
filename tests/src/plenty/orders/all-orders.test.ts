import { assert, test } from "vitest";

import { runScenario, dhtSync } from "@holochain/tryorama";
import { ActionHash, Record, EntryHash } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { EntryRecord } from "@holochain-open-dev/utils";
import { toPromise } from "@holochain-open-dev/signals";

import { Order } from "../../../../ui/src/plenty/orders/types.js";
import { sampleOrder } from "../../../../ui/src/plenty/orders/mocks.js";
import { setup } from "../../setup.js";
import { orderManagerRoleConfig } from "../../../../ui/src/roles.js";

test("create a Order and get all orders", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    await alice.roles.client.assignRole(orderManagerRoleConfig.role, [
      alice.player.agentPubKey,
    ]);

    // Bob gets all orders
    let collectionOutput = await toPromise(bob.orders.allOrders);
    assert.equal(collectionOutput.size, 0);

    // Alice creates a Order
    const order: EntryRecord<Order> = await alice.orders.client.createOrder(
      await sampleOrder(alice.orders.client),
    );
    assert.ok(order);

    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets all orders again
    collectionOutput = await toPromise(bob.orders.allOrders);
    assert.equal(collectionOutput.size, 1);
    assert.deepEqual(order.actionHash, Array.from(collectionOutput.keys())[0]);
  });
});
