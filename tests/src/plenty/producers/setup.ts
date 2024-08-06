import {
  AgentPubKey,
  EntryHash,
  NewEntryAction,
  ActionHash,
  Record,
  AppBundleSource,
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
  fakeDnaHash,
  AppCallZomeRequest,
  AppWebsocket,
  encodeHashToBase64,
} from "@holochain/client";
import { encode } from "@msgpack/msgpack";
import { Scenario } from "@holochain/tryorama";
import { EntryRecord } from "@holochain-open-dev/utils";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { ProducersClient } from "../../../../ui/src/plenty/producers/producers-client.js";
import { ProducersStore } from "../../../../ui/src/plenty/producers/producers-store.js";
import { setupPlayers } from "../../setup.js";

export async function setup(scenario: Scenario) {
  const [alice, bob] = await setupPlayers(scenario);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  const aliceStore = new ProducersStore(
    new ProducersClient(alice.appWs as any, "plenty", "producers"),
  );

  const bobStore = new ProducersStore(
    new ProducersClient(bob.appWs as any, "plenty", "producers"),
  );

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  return {
    alice: {
      player: alice,
      store: aliceStore,
    },
    bob: {
      player: bob,
      store: bobStore,
    },
  };
}
