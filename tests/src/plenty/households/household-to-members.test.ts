import { assert, test } from "vitest";

import { runScenario, dhtSync } from "@holochain/tryorama";
import { EntryRecord } from "@holochain-open-dev/utils";
import { toPromise } from "@holochain-open-dev/signals";
import { cleanNodeDecoding } from "@holochain-open-dev/utils/dist/clean-node-decoding.js";

import { setup } from "./setup.js";

import { Household } from "../../../../ui/src/plenty/households/types.js";
import { sampleHousehold } from "../../../../ui/src/plenty/households/mocks.js";

test("link a Household to a Member", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob } = await setup(scenario);

    const baseRecord: EntryRecord<Household> =
      await alice.store.client.createHousehold(
        await sampleHousehold(alice.store.client),
      );
    const baseAddress = baseRecord.actionHash;
    const targetAddress = bob.player.agentPubKey;

    // Bob gets the links, should be empty
    let linksOutput = await toPromise(
      alice.store.households.get(baseAddress).members.live,
    );
    assert.equal(linksOutput.length, 1);
    let householdsForMemberOutput = await toPromise(
      bob.store.householdsForMember.get(targetAddress),
    );
    assert.equal(householdsForMemberOutput.size, 0);

    // Alice creates a link from Household to Member
    await alice.store.client.addMemberForHousehold(baseAddress, targetAddress);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the links again
    linksOutput = await toPromise(
      bob.store.households.get(baseAddress).members.live,
    );
    assert.equal(linksOutput.length, 2);
    assert.deepEqual(
      cleanNodeDecoding(targetAddress),
      cleanNodeDecoding(linksOutput[1].target),
    );

    householdsForMemberOutput = await toPromise(
      bob.store.householdsForMember.get(targetAddress),
    );
    assert.equal(householdsForMemberOutput.size, 1);

    await alice.store.client.removeMemberForHousehold(
      baseAddress,
      targetAddress,
    );

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

    // Bob gets the links again
    linksOutput = await toPromise(
      bob.store.households.get(baseAddress).members.live,
    );
    assert.equal(linksOutput.length, 1);

    householdsForMemberOutput = await toPromise(
      bob.store.householdsForMember.get(targetAddress),
    );
    assert.equal(householdsForMemberOutput.size, 0);

    // Bob gets the deleted links
    let deletedLinksOutput = await toPromise(
      bob.store.households.get(baseAddress).members.deleted,
    );
    assert.equal(deletedLinksOutput.length, 1);
  });
});
