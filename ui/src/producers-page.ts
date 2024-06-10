import { SignalWatcher } from "@holochain-open-dev/signals";
import { Routes } from "@lit-labs/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import { msg } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";

import "./plenty/producers/elements/all-producers.js";

@customElement("producers-page")
export class ProducersPage extends SignalWatcher(LitElement) {
  routes = new Routes(this, [
    {
      path: "",
      render: () => html`
        <div class="column">
          <all-producers></all-producers>
          <sl-button href="/create-producer"
            >${msg("Create Producer")}</sl-button
          >
        </div>
      `,
    },
  ]);

  renderBreadcrumbs() {
    return html`<sl-breadcrumb> </sl-breadcrumb>`;
  }
  render() {
    return html`
      <div class="column" style="flex: 1">
        ${this.renderBreadcrumbs()} ${this.routes.outlet()}
      </div>
    `;
  }

  static styles = sharedStyles;
}
