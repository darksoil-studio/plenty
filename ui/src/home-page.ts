import {
  Router,
  Routes,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { AsyncResult, SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { consume } from "@lit/context";

import "./producers-page.js";
import "./plenty/households/elements/all-members.js";
import { Household } from "./plenty/households/types.js";
import { HouseholdsStore } from "./plenty/households/households-store.js";
import { householdsStoreContext } from "./plenty/households/context.js";
import { msg } from "@lit/localize";
import { routerContext } from "./context.js";
import { appStyles } from "./app-styles.js";
import { mdiBasket, mdiCarrot, mdiHomeGroup } from "@mdi/js";

@customElement("home-page")
export class HomePage extends SignalWatcher(LitElement) {
  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  @consume({ context: routerContext, subscribe: true })
  router!: Router;

  routes = new Routes(this, [
    {
      path: "",
      enter: () => {
        this.routes.goto("orders/");
        return false;
      },
    },
    {
      path: "orders/*",
      render: () => html` <all-orders></all-orders> `,
    },
    {
      path: "producers/*",
      render: () => html` <producers-page></producers-page> `,
    },
    {
      path: "members/",
      render: () => html`
        <div class="column" style="margin: 16px 0">
          <span class="title">${msg("Households")}</span>
          <sl-divider></sl-divider>
          <all-members></all-members>
        </div>
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
            .active=${this.routes.currentPathname().startsWith("orders/")}
            @click=${() => {
              this.routes.goto("orders/");
            }}
          >
            <div class="row" style="gap: 8px; align-items: center">
              <sl-icon
                .src=${wrapPathInSvg(mdiBasket)}
                style="font-size: 24px"
              ></sl-icon>
              ${msg("Orders")}
            </div>
          </sl-tab>
          <sl-tab
            slot="nav"
            .active=${this.routes.currentPathname().startsWith("producers/")}
            @click=${() => {
              this.routes.goto("producers/");
            }}
          >
            <div class="row" style="gap: 8px; align-items: center">
              <sl-icon
                .src=${wrapPathInSvg(mdiCarrot)}
                style="font-size: 24px"
              ></sl-icon>
              ${msg("Producers")}
            </div>
          </sl-tab>
          <sl-tab
            slot="nav"
            .active=${this.routes.currentPathname().startsWith("members/")}
            @click=${() => {
              this.routes.goto("members/");
            }}
          >
            <div class="row" style="gap: 8px; align-items: center">
              <sl-icon
                .src=${wrapPathInSvg(mdiHomeGroup)}
                style="font-size: 24px"
              ></sl-icon>
              ${msg("Members")}
            </div></sl-tab
          >

          <sl-tab-panel> ${this.routes.outlet()}</sl-tab-panel>
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
    `,
    ...appStyles,
  ];
}
