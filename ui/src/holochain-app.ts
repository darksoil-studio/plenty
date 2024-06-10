import { producersStoreContext } from './plenty/producers/context.js';
import { ProducersClient } from './plenty/producers/producers-client.js';
import { ProducersStore } from './plenty/producers/producers-store.js';

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
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
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
import { Router } from "@lit-labs/router";
import { mdiArrowLeft } from "@mdi/js";

import { householdsStoreContext } from "./plenty/households/context.js";
import "./plenty/households/elements/household-prompt.js";
import "./plenty/households/elements/my-household.js";
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
      path: "/index.html/",
      render: () => this.renderMain(),
    },
    {
      path: "/",
      render: () => this.renderMain(),
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
      ...this._householdStore.notificationsTypes(() =>
        this.router.goto("/my-household"),
      ),
    };
    this._fileStorageClient = new FileStorageClient(appClient, "plenty");
    this._producersStore = new ProducersStore(new ProducersClient(appClient, 'plenty'));
  }

  myHouseholdLatestVersion(): AsyncResult<EntryRecord<Household> | undefined> {
    const myHousehold = this._householdStore.myHousehold.get();
    if (myHousehold.status !== "completed") return myHousehold;
    if (!myHousehold.value)
      return {
        status: "completed",
        value: undefined,
      };
    return myHousehold.value?.latestVersion.get();
  }

  renderMyProfile() {
    const household = this.myHouseholdLatestVersion();

    switch (household.status) {
      case "pending":
        return html`<profile-list-item-skeleton></profile-list-item-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching your household")}
          .error=${household.error}
          tooltip
        ></display-error>`;
      case "completed":
        return html`<div
          class="row"
          style="align-items: center; cursor: pointer"
          @click=${() => this.router.goto("/my-household")}
        >
          <show-image
            style="width: 32px; height: 32px;"
            .imageHash=${household.value?.entry.avatar}
          ></show-image>
          <span style="margin: 0 16px;">${household.value?.entry.name}</span>
        </div>`;
    }
  }

  renderMyHousehold() {
    return html`<div class="column fill">
      <div
        class="row top-bar"
        style="align-items: center; padding: 16px; gap: 16px;"
      >
        <sl-icon-button
          .src=${wrapPathInSvg(mdiArrowLeft)}
          @click=${() => this.router.goto("/")}
        ></sl-icon-button>
        <span class="title" style="flex: 1">${msg("My Household")}</span>
      </div>

      <div class="column" style="align-items: center; flex: 1; padding: 24px">
        <my-household></my-household>
      </div>
    </div>`;
  }

  renderMain() {
    return html`
      <div class="column fill">
        <div class="row top-bar">
          <span class="title" style="flex: 1">${msg("Plenty")}</span>

          <div class="row" style="gap: 16px" slot="actionItems">
            <my-notifications-icon-button></my-notifications-icon-button>
            ${this.renderMyProfile()}
          </div>
        </div>

        <sl-tab-group placement="start">
          <sl-tab slot="nav" panel="orders">${msg("Orders")}</sl-tab>
          <sl-tab slot="nav" panel="producers">${msg("Producers")}</sl-tab>
          <sl-tab slot="nav" panel="members">${msg("Members")}</sl-tab>

          <sl-tab-panel name="orders"
            >This is the general tab panel.</sl-tab-panel
          >
          <sl-tab-panel name="producers"
            >This is the general tab panel.</sl-tab-panel
          >
          <sl-tab-panel name="members"
            >This is the general tab panel.</sl-tab-panel
          >
        </sl-tab-group>
      </div>
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
  ];}
