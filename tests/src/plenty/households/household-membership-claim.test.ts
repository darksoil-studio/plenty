import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, SignedActionHashed, Delete, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/stores';

import { HouseholdMembershipClaim } from '../../../../ui/src/plenty/households/types.js';
import { sampleHouseholdMembershipClaim } from '../../../../ui/src/plenty/households/mocks.js';
import { setup } from './setup.js';

test('create HouseholdMembershipClaim', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a HouseholdMembershipClaim
    const householdMembershipClaim: EntryRecord<HouseholdMembershipClaim> = await alice.store.client.createHouseholdMembershipClaim(await sampleHouseholdMembershipClaim(alice.store.client));
    assert.ok(householdMembershipClaim);
  });
});

test('create and read HouseholdMembershipClaim', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleHouseholdMembershipClaim(alice.store.client);

    // Alice creates a HouseholdMembershipClaim
    const householdMembershipClaim: EntryRecord<HouseholdMembershipClaim> = await alice.store.client.createHouseholdMembershipClaim(sample);
    assert.ok(householdMembershipClaim);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the created HouseholdMembershipClaim
    const createReadOutput: EntryRecord<HouseholdMembershipClaim> = await toPromise(bob.store.householdMembershipClaims.get(householdMembershipClaim.actionHash).entry);
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});


