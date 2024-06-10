import { producersStoreContext } from "./plenty/producers/context.js";
import { ProducersClient } from "./plenty/producers/producers-client.js";
import { ProducersStore } from "./plenty/producers/producers-store.js";

import { sharedStyles, wrapPathInSvg } from "@holochain-open-dev/elements";
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
import "@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js";
import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
import { AppClient, AppWebsocket } from "@holochain/client";
import { provide } from "@lit/context";
import { localized, msg } from "@lit/localize";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AsyncResult, SignalWatcher } from "@holochain-open-dev/signals";
import { EntryRecord } from "@holochain-open-dev/utils";
import {
  NotificationsClient,
  NotificationsStore,
  notificationsStoreContext,
} from "@darksoil-studio/notifications";
import "@darksoil-studio/notifications/dist/elements/my-notifications-icon-button.js";
import { Router, Routes } from "@lit-labs/router";
import { mdiArrowLeft } from "@mdi/js";

import "./home-page.js";
import { householdsStoreContext } from "./plenty/households/context.js";
import "./plenty/households/elements/household-prompt.js";
import "./plenty/households/elements/my-household.js";
import "./plenty/producers/elements/create-producer.js";
import { HouseholdsClient } from "./plenty/households/households-client.js";
import { HouseholdsStore } from "./plenty/households/households-store.js";

import { Household } from "./plenty/households/types.js";

@localized()
@customElement("holochain-app")
export class HolochainApp extends SignalWatcher(LitElement) {
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

  _client!: AppClient;

  router = new Router(this, [
    {
      path: "/",
      render: () => html``,
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
      path: "/create-producer",
      render: () => this.renderCreateProducer(),
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
    );
    this._notificationsStore.notificationsConfig.types = {
      ...this._notificationsStore.notificationsConfig.types,
      ...this._householdStore.notificationsTypes(() => {
        this.router.goto("/my-household");
        window.history.pushState(null, "", "/my-household");
      }),
    };
    this._fileStorageClient = new FileStorageClient(appClient, "plenty");
    this._producersStore = new ProducersStore(
      new ProducersClient(appClient, "plenty"),
    );
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
            window.history.back();
            // if (window.location.pathname === "/my-household") {
            // window.history.pushState(Date.now(), "", "/");
            // }
          }}
        ></sl-icon-button>
        <span class="title" style="flex: 1">${msg("My Household")}</span>
      </div>

      <div class="column" style="align-items: center; flex: 1; padding: 24px">
        <my-household></my-household>
      </div>
    </div>`;
  }

  renderCreateProducer() {
    return html`
      <create-producer
        @producer-created=${() => {
          // window.location.pathname = "/home/producers/";
          window.history.pushState({}, "", "/home/producers/");
          this.router.goto("/home/producers/");
        }}
      ></create-producer>
    `;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-content: center; justify-content: center;"
      >
        <sl-spinner style="font-size: 2rem"></sl-spinner>
      </div>`;

    if (this._error)
      return html`
        <div
          style="flex: 1; height: 100%; align-content: center; justify-content: center;"
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

      .top-bar {
        align-items: center;
        color: white;
        background-color: var(--sl-color-primary-900);
        padding: 16px;
      }
    `,
    sharedStyles,
  ];
}
