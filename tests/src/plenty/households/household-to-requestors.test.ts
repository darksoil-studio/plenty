import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { toPromise } from '@holochain-open-dev/stores';

import { setup } from './setup.js';

import { Household } from '../../../../ui/src/plenty/households/types.js';
import { sampleHousehold } from '../../../../ui/src/plenty/households/mocks.js';
import { cleanNodeDecoding } from "@holochain-open-dev/utils/dist/clean-node-decoding.js";

test('link a Household to a Requestor', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const baseRecord: EntryRecord<Household> = await alice.store.client.createHousehold(await sampleHousehold(alice.store.client));
    const baseAddress = baseRecord.actionHash;

    // Bob gets the links, should be empty
    let linksOutput = await toPromise(bob.store.households.get(baseAddress).requestors.live);
    assert.equal(linksOutput.length, 0);

    // Alice creates a link from Household to Requestor
    const joinRequestHash = await bob.store.client.requestToJoinHousehold(baseAddress);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the links again
    linksOutput = await toPromise(bob.store.households.get(baseAddress).requestors.live);
    assert.equal(linksOutput.length, 1);
    assert.deepEqual(cleanNodeDecoding(bob.player.agentPubKey), cleanNodeDecoding(linksOutput[0].target));

    await alice.store.client.rejectJoinRequest(joinRequestHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the links again
    linksOutput = await toPromise(alice.store.households.get(baseAddress).requestors.live);
    assert.equal(linksOutput.length, 0);

    // Bob gets the deleted links
    let deletedLinksOutput = await toPromise(bob.store.households.get(baseAddress).requestors.deleted);
    assert.equal(deletedLinksOutput.length, 1);
  });
});