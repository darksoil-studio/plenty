import { Scenario, dhtSync } from "@holochain/tryorama";
import { ProfilesStore, ProfilesClient } from "@holochain-open-dev/profiles";
import {
  NotificationsStore,
  NotificationsClient,
} from "@darksoil-studio/notifications";
import { appPath } from "../../app-path.js";
import { HouseholdsClient } from "../../../../ui/src/plenty/households/households-client.js";
import { HouseholdsStore } from "../../../../ui/src/plenty/households/households-store.js";
import { AppClient } from "@holochain/client";

function setupStore(appClient: AppClient): HouseholdsStore {
  const profilesStore = new ProfilesStore(
    new ProfilesClient(appClient, "plenty"),
  );
  const notificationsStore = new NotificationsStore(
    new NotificationsClient(appClient, "plenty"),
    {
      types: {},
    },
  );
  const householdStore = new HouseholdsStore(
    new HouseholdsClient(notificationsStore, appClient, "plenty"),
    profilesStore,
  );
  notificationsStore.notificationsConfig.types = {
    ...notificationsStore.notificationsConfig.types,
    ...householdStore.notificationsTypes(() => {
      console.log("notification clicked");
    }),
  };
  return householdStore;
}

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

  const aliceStore = setupStore(alice.appWs as any);
  const bobStore = setupStore(bob.appWs as any);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  const awaitConsistency = async () => {
    const start = Date.now();
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);
    console.log(`Took ${Date.now() - start}ms to reach consistency`);
  };

  return {
    awaitConsistency,
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
  ]);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  const aliceStore = setupStore(alice.appWs as any);
  const bobStore = setupStore(bob.appWs as any);
  const carolStore = setupStore(carol.appWs as any);
  const daveStore = setupStore(dave.appWs as any);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  const awaitConsistency = async () => {
    const start = Date.now();
    await dhtSync([alice, bob, carol, dave], alice.cells[0].cell_id[0]);
    console.log(`Took ${Date.now() - start}ms to reach consistency`);
  };

  return {
    awaitConsistency,
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
