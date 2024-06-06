import { assert, expect, test } from "vitest";

import { runScenario, dhtSync } from "@holochain/tryorama";
import { EntryRecord } from "@holochain-open-dev/utils";
import { toPromise } from "@holochain-open-dev/signals";

import { Household } from "../../../../ui/src/plenty/households/types.js";
import { sampleHousehold } from "../../../../ui/src/plenty/households/mocks.js";
import { setup, setup4 } from "./setup.js";

test("Alice creates a Household, bobs joins it", async () => {
  await runScenario(async (scenario) => {
    const { alice, bob, carol, dave } = await setup4(scenario);

    const sample = await sampleHousehold(alice.store.client);

    // Alice creates a Household
    const household: EntryRecord<Household> =
      await alice.store.client.createHousehold(sample);
    let members = await toPromise(
      alice.store.households.get(household.actionHash).members.live,
    );
    assert.equal(members.length, 1);

    assert.ok(household);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );

    await bob.store.client.requestToJoinHousehold(household.actionHash);
    await carol.store.client.requestToJoinHousehold(household.actionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );

    // Bob can't reject or accept the join request because he's not a member of the household
    await expect(
      () =>
        bob.store.client.rejectJoinRequest(
          household.actionHash,
          carol.player.agentPubKey,
        ),
      "Bob was able to reject the join request without being a member of the household",
    ).rejects.toThrowError(undefined);
    await expect(
      () =>
        bob.store.client.acceptJoinRequest(
          household.actionHash,
          carol.player.agentPubKey,
        ),
      "Bob was able to accept the join request without being a member of the household",
    ).rejects.toThrowError(undefined);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );
    members = await toPromise(
      alice.store.households.get(household.actionHash).members.live,
    );
    assert.equal(members.length, 1);

    let requestors = await toPromise(
      alice.store.households.get(household.actionHash).requestors.live,
    );
    assert.equal(requestors.length, 2);

    await alice.store.client.rejectJoinRequest(
      household.actionHash,
      bob.player.agentPubKey,
    );

    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );

    requestors = await toPromise(
      bob.store.households.get(household.actionHash).requestors.live,
    );
    assert.equal(requestors.length, 1);

    await bob.store.client.requestToJoinHousehold(household.actionHash);

    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );
    requestors = await toPromise(
      carol.store.households.get(household.actionHash).requestors.live,
    );
    assert.equal(requestors.length, 2);

    await alice.store.client.acceptJoinRequest(
      household.actionHash,
      bob.player.agentPubKey,
    );

    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );

    members = await toPromise(
      bob.store.households.get(household.actionHash).members.live,
    );
    await bob.store.client.createHouseholdMembershipClaim({
      household_hash: household.actionHash,
      member_create_link_hash: members.find(
        (link) =>
          link.target.toString() ===
          new Uint8Array(bob.player.agentPubKey).toString(),
      ).create_link_hash,
    });

    requestors = await toPromise(
      alice.store.households.get(household.actionHash).requestors.live,
    );
    assert.equal(requestors.length, 1);

    members = await toPromise(
      alice.store.households.get(household.actionHash).members.live,
    );
    assert.equal(members.length, 2);

    // Now Bob can accept Carol
    await bob.store.client.acceptJoinRequest(
      household.actionHash,
      carol.player.agentPubKey,
    );

    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );

    members = await toPromise(
      carol.store.households.get(household.actionHash).members.live,
    );
    assert.equal(members.length, 3);
    await carol.store.client.createHouseholdMembershipClaim({
      household_hash: household.actionHash,
      member_create_link_hash: members.find(
        (link) =>
          link.target.toString() ===
          new Uint8Array(carol.player.agentPubKey).toString(),
      ).create_link_hash,
    });

    // Bob leaves the household
    await bob.store.client.leaveHousehold(household.actionHash);

    const daveJoinRequestHash = await dave.store.client.requestToJoinHousehold(
      household.actionHash,
    );

    await dhtSync(
      [alice.player, bob.player, carol.player, dave.player],
      alice.player.cells[0].cell_id[0],
    );

    await expect(
      () =>
        bob.store.client.rejectJoinRequest(
          household.actionHash,
          dave.player.agentPubKey,
        ),
      "Bob was able to reject the join request of Dave even after leaving the household",
    ).rejects.toThrow();
    await expect(
      () =>
        bob.store.client.acceptJoinRequest(
          household.actionHash,
          dave.player.agentPubKey,
        ),
      "Bob was able to accept the join request of Dave even after leaving the household",
    ).rejects.toThrow();

    await carol.store.client.acceptJoinRequest(
      household.actionHash,
      dave.player.agentPubKey,
    );
  });
});
