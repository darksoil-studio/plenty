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

import { Household } from "../../../../ui/src/plenty/households/types.js";
import { sampleHousehold } from "../../../../ui/src/plenty/households/mocks.js";
import { setup } from "./setup.js";

test("create Household", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Household
    const household: EntryRecord<Household> =
      await alice.store.client.createHousehold(
        await sampleHousehold(alice.store.client),
      );
    assert.ok(household);
  });
});

test("create and read Household", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleHousehold(alice.store.client);

    // Alice creates a Household
    const household: EntryRecord<Household> =
      await alice.store.client.createHousehold(sample);
    assert.ok(household);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the created Household
    const createReadOutput: EntryRecord<Household> = await toPromise(
      bob.store.households.get(household.actionHash).original$,
    );
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test("create and update Household", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Household
    const household: EntryRecord<Household> =
      await alice.store.client.createHousehold(
        await sampleHousehold(alice.store.client),
      );
    assert.ok(household);

    const originalActionHash = household.actionHash;

    // Alice updates the Household
    let contentUpdate = await sampleHousehold(alice.store.client);

    let updatedHousehold: EntryRecord<Household> =
      await alice.store.client.updateHousehold(
        originalActionHash,
        originalActionHash,
        contentUpdate,
      );
    assert.ok(updatedHousehold);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated Household
    const readUpdatedOutput0: EntryRecord<Household> = await toPromise(
      bob.store.households.get(household.actionHash).latestVersion$,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput0.entry),
    );

    // Alice updates the Household again
    contentUpdate = await sampleHousehold(alice.store.client);

    updatedHousehold = await alice.store.client.updateHousehold(
      originalActionHash,
      updatedHousehold.actionHash,
      contentUpdate,
    );
    assert.ok(updatedHousehold);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the updated Household
    const readUpdatedOutput1: EntryRecord<Household> = await toPromise(
      bob.store.households.get(originalActionHash).latestVersion$,
    );
    assert.deepEqual(
      contentUpdate,
      cleanNodeDecoding(readUpdatedOutput1.entry),
    );
  });
});

test("create and delete Household", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a Household
    const household: EntryRecord<Household> =
      await alice.store.client.createHousehold(
        await sampleHousehold(alice.store.client),
      );
    assert.ok(household);

    // Alice deletes the Household
    const deleteActionHash = await alice.store.client.deleteHousehold(
      household.actionHash,
    );
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob tries to get the deleted Household
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
      bob.store.households.get(household.actionHash).deletes$,
    );
    assert.equal(deletes.length, 1);
  });
});
