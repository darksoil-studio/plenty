import { Scenario } from '@holochain/tryorama';
import { appPath } from '../../app-path.js';
import { HouseholdsClient } from '../../../../ui/src/plenty/households/households-client.js';
import { HouseholdsStore } from '../../../../ui/src/plenty/households/households-store.js';

export async function setup(scenario: Scenario) {
  // Add 2 players with the test hApp to the Scenario. The returned players
  // can be destructured.
  const [alice, bob] = await scenario.addPlayersWithApps([
    { appBundleSource: { path: appPath } },
    { appBundleSource: { path: appPath } },
  ]);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  const aliceStore = new HouseholdsStore(
    new HouseholdsClient(alice.appAgentWs as any, 'plenty', 'households')
  );

  const bobStore = new HouseholdsStore(
    new HouseholdsClient(bob.appAgentWs as any, 'plenty', 'households')
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


export async function setup4(scenario: Scenario) {
  // Add 2 players with the test hApp to the Scenario. The returned players
  // can be destructured.
  const [alice, bob, carol, dave] = await scenario.addPlayersWithApps([
    { appBundleSource: { path: appPath } },
    { appBundleSource: { path: appPath } },
    { appBundleSource: { path: appPath } },
    { appBundleSource: { path: appPath } },
    { appBundleSource: { path: appPath } },
  ]);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  const aliceStore = new HouseholdsStore(
    new HouseholdsClient(alice.appAgentWs as any, 'plenty', 'households')
  );

  const bobStore = new HouseholdsStore(
    new HouseholdsClient(bob.appAgentWs as any, 'plenty', 'households')
  );

  const carolStore = new HouseholdsStore(
    new HouseholdsClient(carol.appAgentWs as any, 'plenty', 'households')
  );
  const daveStore = new HouseholdsStore(
    new HouseholdsClient(carol.appAgentWs as any, 'plenty', 'households')
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
    carol: {
      player: carol,
      store: carolStore,
    },
    dave: {
      player: dave,
      store: daveStore,
    },
  };
}

