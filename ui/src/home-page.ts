import { sharedStyles, wrapPathInSvg } from "@holochain-open-dev/elements";
import { AsyncResult, SignalWatcher } from "@holochain-open-dev/signals";
import { Routes } from "@lit-labs/router";
import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { consume } from "@lit/context";

import "./producers-page.js";
import { Household } from "./plenty/households/types.js";
import { HouseholdsStore } from "./plenty/households/households-store.js";
import { householdsStoreContext } from "./plenty/households/context.js";
import { msg } from "@lit/localize";
import { mdiArrowLeft } from "@mdi/js";

@customElement("home-page")
export class HomePage extends SignalWatcher(LitElement) {
  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  routes = new Routes(this, [
    {
      path: "",
      enter: () => {
        this.routes.goto("orders");

        return false;
      },
      // render: () => html`
      //   <sl-tab-panel name="orders"><all-orders></all-orders></sl-tab-panel>
      // `,
    },
    {
      path: "orders/*",
      render: () => html`
        <sl-tab-panel name="orders"><all-orders></all-orders></sl-tab-panel>
      `,
    },
    {
      path: "producers/*",
      render: () => html`
        <sl-tab-panel name="producers" style="height: 100%"
          ><producers-page></producers-page>
        </sl-tab-panel>
      `,
    },
    {
      path: "members",
      render: () => html`
        <sl-tab-panel name="members"> <all-members></all-members></sl-tab-panel>
      `,
    },
  ]);

  myHouseholdLatestVersion(): AsyncResult<EntryRecord<Household> | undefined> {
    const myHousehold = this.householdsStore.myHousehold.get();
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
        return html`<a
          class="row"
          style="align-items: center; cursor: pointer"
          href="/my-household"
        >
          <show-image
            style="width: 32px; height: 32px;"
            .imageHash=${household.value?.entry.avatar}
          ></show-image>
          <span style="margin: 0 16px;">${household.value?.entry.name}</span>
        </a>`;
    }
  }

  render() {
    return html`
      <div class="column fill">
        <div class="row top-bar">
          <span class="title" style="flex: 1">${msg("Plenty")}</span>

          <div class="row" style="gap: 16px" slot="actionItems">
            <my-notifications-icon-button></my-notifications-icon-button>
            ${this.renderMyProfile()}
          </div>
        </div>

        <sl-tab-group placement="start" style="flex: 1">
          <sl-tab
            slot="nav"
            .active=${window.location.pathname.endsWith("/orders/")}
            panel="orders"
            @click=${() => {
              window.history.pushState({}, "", this.routes.link("orders/"));
              this.routes.goto("orders/");
            }}
            >${msg("Orders")}</sl-tab
          >
          <sl-tab
            slot="nav"
            panel="producers"
            .active=${window.location.pathname.endsWith("/producers/")}
            @click=${() => {
              window.history.pushState({}, "", this.routes.link("producers/"));
              this.routes.goto("producers/");
            }}
            >${msg("Producers")}</sl-tab
          >
          <sl-tab
            slot="nav"
            .active=${window.location.pathname.endsWith("/members/")}
            panel="members"
            >${msg("Members")}</sl-tab
          >

          ${this.routes.outlet()}
        </sl-tab-group>
      </div>
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
