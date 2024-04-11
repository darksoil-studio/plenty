import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, Record, EntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { toPromise } from '@holochain-open-dev/stores';

import { Household } from '../../../../ui/src/plenty/households/types.js';
import { sampleHousehold } from '../../../../ui/src/plenty/households/mocks.js';
import { setup } from './setup.js';

test('create a Household and get active households', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Bob gets active households
    let collectionOutput = await toPromise(bob.store.activeHouseholds);
    assert.equal(collectionOutput.size, 0);

    // Alice creates a Household
    const household: EntryRecord<Household> = await alice.store.client.createHousehold(await sampleHousehold(alice.store.client));
    assert.ok(household);

    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets active households again
    collectionOutput = await toPromise(bob.store.activeHouseholds);
    assert.equal(collectionOutput.size, 1);
    assert.deepEqual(household.actionHash, Array.from(collectionOutput.keys())[0]);
  });
});

