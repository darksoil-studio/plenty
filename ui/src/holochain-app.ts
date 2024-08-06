import { ordersStoreContext } from "./plenty/orders/context.js";
import { OrdersClient } from "./plenty/orders/orders-client.js";
import { OrdersStore } from "./plenty/orders/orders-store.js";

import {
  Router,
  Routes,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import {
  FileStorageClient,
  fileStorageClientContext,
} from "@holochain-open-dev/file-storage";
import {
  ProfilesClient,
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
import "@holochain-open-dev/profiles/dist/elements/my-profile.js";
import "@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js";
import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
import {
  ActionHashB64,
  AppClient,
  AppWebsocket,
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";
import { createContext, provide } from "@lit/context";
import { localized, msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@holochain-open-dev/signals";
import {
  NotificationsClient,
  NotificationsStore,
  notificationsStoreContext,
} from "@darksoil-studio/notifications";
import "@darksoil-studio/notifications/dist/elements/my-notifications-icon-button.js";
import { mdiArrowLeft } from "@mdi/js";
import {
  RolesStore,
  RolesClient,
  rolesStoreContext,
} from "@darksoil-studio/roles";

import "./home-page.js";
import { householdsStoreContext } from "./plenty/households/context.js";
import "./plenty/households/elements/household-prompt.js";
import "./plenty/households/elements/my-household.js";
import { producersStoreContext } from "./plenty/producers/context.js";
import { ProducersClient } from "./plenty/producers/producers-client.js";
import { ProducersStore } from "./plenty/producers/producers-store.js";
import "./plenty/producers/elements/create-producer.js";
import "./plenty/producers/elements/create-product.js";
import { HouseholdsClient } from "./plenty/households/households-client.js";
import { HouseholdsStore } from "./plenty/households/households-store.js";
import { routerContext } from "./context.js";
import { appStyles } from "./app-styles.js";
import {
  bookkeeperRoleConfig,
  orderManagerRoleConfig,
  rolesConfig,
} from "./roles.js";

@localized()
@customElement("holochain-app")
export class HolochainApp extends SignalWatcher(LitElement) {
  @provide({ context: ordersStoreContext })
  @property()
  _ordersStore!: OrdersStore;

  @provide({ context: producersStoreContext })
  @property()
  _producersStore!: ProducersStore;

  @provide({ context: householdsStoreContext })
  @property()
  _householdStore!: HouseholdsStore;

  @state() _loading = true;

  @state() _error: any | undefined;

  @provide({ context: profilesStoreContext })
  @property()
  _profilesStore!: ProfilesStore;

  @provide({ context: notificationsStoreContext })
  @property()
  _notificationsStore!: NotificationsStore;

  @provide({ context: fileStorageClientContext })
  @property()
  _fileStorageClient!: FileStorageClient;

  @provide({ context: rolesStoreContext })
  @property()
  _rolesStore!: RolesStore;

  _client!: AppClient;

  @provide({ context: routerContext })
  router = new Router(this, [
    {
      path: "",
      enter: () => {
        this.router.goto("/home/");
        return false;
      },
    },
    {
      path: "/",
      enter: () => {
        this.router.goto("/home/");
        return false;
      },
    },
    {
      path: "/home/*",
      render: () => html`<home-page style="flex: 1"></home-page>`,
    },
    {
      path: "/my-household",
      render: () => this.renderMyHousehold(),
    },
  ]);

  async firstUpdated() {
    try {
      this._client = await AppWebsocket.connect();
      await this.initStores(this._client);
    } catch (e: any) {
      this._error = e;
    } finally {
      this._loading = false;
    }
  }

  // Don't change this
  async initStores(appClient: AppClient) {
    this._profilesStore = new ProfilesStore(
      new ProfilesClient(appClient, "plenty"),
    );
    this._notificationsStore = new NotificationsStore(
      new NotificationsClient(appClient, "plenty"),
      {
        types: {},
      },
    );
    this._householdStore = new HouseholdsStore(
      new HouseholdsClient(this._notificationsStore, appClient, "plenty"),
      this._profilesStore,
      this._notificationsStore,
      () => this.router.goto("/my-household"),
    );
    this._fileStorageClient = new FileStorageClient(appClient, "plenty");
    this._producersStore = new ProducersStore(
      new ProducersClient(appClient, "plenty"),
    );
    this._rolesStore = new RolesStore(
      new RolesClient(appClient, "plenty"),
      rolesConfig,
      this._notificationsStore,
    );
    this._ordersStore = new OrdersStore(new OrdersClient(appClient, "plenty"));
  }

  renderMyHousehold() {
    return html`<div class="column fill">
      <div
        class="row top-bar"
        style="align-items: center; padding: 16px; gap: 16px;"
      >
        <sl-icon-button
          .src=${wrapPathInSvg(mdiArrowLeft)}
          @click=${() => {
            this.router.pop();
          }}
        ></sl-icon-button>
        <span class="title" style="flex: 1">${msg("My Household")}</span>
      </div>

      <div class="column" style="align-items: center; flex: 1; padding: 24px">
        <my-household></my-household>
      </div>
    </div>`;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-items: center; justify-content: center;"
      >
        <sl-spinner style="font-size: 2rem;"></sl-spinner>
      </div>`;

    if (this._error)
      return html`
        <div
          style="flex: 1; height: 100%; align-items: center; justify-content: center;"
        >
          <display-error
            .error=${this._error}
            .headline=${msg("Error connecting to holochain.")}
          >
          </display-error>
        </div>
      `;

    return html`
      <profile-prompt style="flex: 1;">
        <household-prompt> ${this.router.outlet()} </household-prompt>
      </profile-prompt>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    ...appStyles,
  ];
}
