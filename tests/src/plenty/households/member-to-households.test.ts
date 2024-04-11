import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { toPromise } from '@holochain-open-dev/stores';

import { setup } from './setup.js';

import { Household } from '../../../../ui/src/plenty/households/types.js';
import { sampleHousehold } from '../../../../ui/src/plenty/households/mocks.js';

test('link a Member to a Household', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const baseAddress = alice.player.agentPubKey;
    const targetRecord: EntryRecord<Household> = await alice.store.client.createHousehold(await sampleHousehold(alice.store.client));
    const targetAddress = targetRecord.actionHash;

    // Bob gets the links, should be empty
    let linksOutput = await toPromise(bob.store.householdsForMember.get(baseAddress));
    assert.equal(linksOutput.size, 0);

    // Alice creates a link from Member to Household
    await alice.store.client.addHouseholdForMember(baseAddress, targetAddress);
    
    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
    
    // Bob gets the links again
    linksOutput = await toPromise(bob.store.householdsForMember.get(baseAddress));
    assert.equal(linksOutput.size, 1);
    assert.deepEqual(targetAddress, Array.from(linksOutput.keys())[0]);


  });
});
