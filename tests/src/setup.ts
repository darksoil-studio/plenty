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
  AppBundle,
  AppClient,
} from "@holochain/client";
import { decode, encode } from "@msgpack/msgpack";
import { AgentApp, enableAndGetAgentApp, Scenario } from "@holochain/tryorama";
import { EntryRecord } from "@holochain-open-dev/utils";
import { appPath } from "./app-path.js";
import fs from "fs";
import path from "path";
import { decompressSync } from "fflate";
import { fileURLToPath } from "url";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import { RolesClient, RolesStore } from "@darksoil-studio/roles";
import {
  NotificationsStore,
  NotificationsClient,
} from "@darksoil-studio/notifications";

import { OrdersStore } from "../../ui/src/plenty/orders/orders-store.js";
import { OrdersClient } from "../../ui/src/plenty/orders/orders-client.js";
import { rolesConfig } from "../../ui/src/roles.js";
import { HouseholdsStore } from "../../ui/src/plenty/households/households-store.js";
import { HouseholdsClient } from "../../ui/src/plenty/households/households-client.js";
import { ProducersStore } from "../../ui/src/plenty/producers/producers-store.js";
import { ProducersClient } from "../../ui/src/plenty/producers/producers-client.js";

export function plentyHapp(): AppBundle {
  const appBundleBytes = fs.readFileSync(appPath);

  return decode(decompressSync(new Uint8Array(appBundleBytes))) as any;
}
function setupStores(appClient: AppClient) {
  const profiles = new ProfilesStore(new ProfilesClient(appClient, "plenty"));
  const notifications = new NotificationsStore(
    new NotificationsClient(appClient, "plenty"),
    {
      types: {},
    },
  );
  const households = new HouseholdsStore(
    new HouseholdsClient(notifications, appClient, "plenty"),
    profiles,
    notifications,
    () => {},
  );
  notifications.notificationsConfig.types = {
    ...notifications.notificationsConfig.types,
    ...households.notificationsTypes(() => {
      console.log("notification clicked");
    }),
  };
  const orders = new OrdersStore(
    new OrdersClient(appClient, "plenty", "orders"),
  );

  const roles = new RolesStore(
    new RolesClient(appClient, "plenty", "roles"),
    rolesConfig,
  );

  const producers = new ProducersStore(
    new ProducersClient(appClient, "plenty", "producers"),
  );
  return {
    households,
    roles,
    orders,
    producers,
    notifications,
    profiles,
  };
}

export async function setup(scenario: Scenario) {
  const [alice, bob] = await setupPlayers(scenario);

  patchCallZome(alice.appWs as any);
  patchCallZome(bob.appWs as any);

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  return {
    alice: {
      player: alice,
      ...setupStores(alice.appWs as AppClient),
    },
    bob: {
      player: bob,
      ...setupStores(bob.appWs as AppClient),
    },
  };
}

export function patchCallZome(appWs: AppWebsocket) {
  const callZome = appWs.callZome;

  appWs.callZome = async (req) => {
    try {
      const result = await callZome(req);
      return result;
    } catch (e) {
      if (
        !e.toString().includes("Socket is not open") &&
        !e.toString().includes("ClientClosedWithPendingRequests")
      ) {
        throw e;
      }
    }
  };
}

export async function setupPlayers(
  scenario: Scenario,
  playerNumber: number = 2,
) {
  const progenitorConductor = await scenario.addConductor();

  const alicePubKey = await progenitorConductor.adminWs().generateAgentPubKey();

  const appBundle = plentyHapp();

  const role = appBundle.manifest.roles.find((r) => r.name === "plenty")!;
  role.dna.modifiers = {
    ...role.dna.modifiers,
    properties: {
      progenitors: [encodeHashToBase64(alicePubKey)],
    } as any,
  };
  const appBundleSource = { bundle: appBundle };

  const appInfo = await progenitorConductor.installApp(appBundleSource, {
    agentPubKey: alicePubKey,
    networkSeed: scenario.networkSeed,
  });

  const port = await progenitorConductor.attachAppInterface();

  const issued = await progenitorConductor
    .adminWs()
    .issueAppAuthenticationToken({
      installed_app_id: appInfo.installed_app_id,
    });
  const appWs = await progenitorConductor.connectAppWs(issued.token, port);

  // patchCallZome(appWs);

  const progenitor: AgentApp = await enableAndGetAgentApp(
    progenitorConductor.adminWs(),
    appWs,
    appInfo,
  );

  await progenitorConductor
    .adminWs()
    .authorizeSigningCredentials(
      (Object.values(appInfo.cell_info)[0][0] as any).provisioned.cell_id,
    );

  // Add 2 players with the test hApp to the Scenario. The returned players
  // can be destructured.
  const players = await scenario.addPlayersWithApps(
    Array.from({ length: playerNumber - 1 }, () => ({ appBundleSource })),
  );

  for (const player of players) {
    await player.conductor
      .adminWs()
      .authorizeSigningCredentials(player.cells[0].cell_id);
  }

  // Shortcut peer discovery through gossip and register all agents in every
  // conductor of the scenario.
  await scenario.shareAllAgents();

  return [{ conductor: progenitorConductor, appWs, ...progenitor }, ...players];
}
