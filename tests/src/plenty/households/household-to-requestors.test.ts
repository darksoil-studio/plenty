import { assert, test } from "vitest";

import { runScenario, dhtSync } from "@holochain/tryorama";
import { ActionHash, Record } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { EntryRecord } from "@holochain-open-dev/utils";
import { toPromise } from "@holochain-open-dev/signals";
import { cleanNodeDecoding } from "@holochain-open-dev/utils/dist/clean-node-decoding.js";

import { setup } from "./setup.js";

import { Household } from "../../../../ui/src/plenty/households/types.js";
import { sampleHousehold } from "../../../../ui/src/plenty/households/mocks.js";

test("link a Household to a Requestor", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    const household: EntryRecord<Household> =
      await alice.store.client.createHousehold(
        await sampleHousehold(alice.store.client),
      );
    const householdHash = household.actionHash;

    // Bob gets the links, should be empty
    let requestors = await toPromise(
      bob.store.households.get(householdHash).requestors.live$,
    );
    assert.equal(requestors.length, 0);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Alice creates a link from Household to Requestor
    await bob.store.client.requestToJoinHousehold(householdHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the links again
    requestors = await toPromise(
      bob.store.households.get(householdHash).requestors.live$,
    );
    assert.equal(requestors.length, 1);
    assert.deepEqual(
      cleanNodeDecoding(bob.player.agentPubKey),
      cleanNodeDecoding(requestors[0]),
    );

    await alice.store.client.rejectJoinRequest(
      household.actionHash,
      bob.player.agentPubKey,
    );

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the links again
    requestors = await toPromise(
      alice.store.households.get(householdHash).requestors.live$,
    );
    assert.equal(requestors.length, 0);

    // Bob gets the deleted links
    let deletedLinksOutput = await toPromise(
      bob.store.households.get(householdHash).requestors.deleted$,
    );
    assert.equal(deletedLinksOutput.length, 1);
  });
});

test("Request to join household and cancel it ", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    const baseRecord: EntryRecord<Household> =
      await alice.store.client.createHousehold(
        await sampleHousehold(alice.store.client),
      );
    const baseAddress = baseRecord.actionHash;

    // Bob gets the links, should be empty
    let requestors = await toPromise(
      bob.store.households.get(baseAddress).requestors.live$,
    );
    assert.equal(requestors.length, 0);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Alice creates a link from Household to Requestor
    await bob.store.client.requestToJoinHousehold(baseAddress);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the links again
    requestors = await toPromise(
      bob.store.households.get(baseAddress).requestors.live$,
    );
    assert.equal(requestors.length, 1);
    assert.deepEqual(
      cleanNodeDecoding(bob.player.agentPubKey),
      cleanNodeDecoding(requestors[0]),
    );

    await bob.store.client.cancelJoinRequest(baseAddress);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the links again
    requestors = await toPromise(
      alice.store.households.get(baseAddress).requestors.live$,
    );
    assert.equal(requestors.length, 0);

    // Bob gets the deleted links
    let deletedLinksOutput = await toPromise(
      bob.store.households.get(baseAddress).requestors.deleted$,
    );
    assert.equal(deletedLinksOutput.length, 1);
  });
});
