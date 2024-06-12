import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import { msg } from "@lit/localize";
import { Router, Routes, sharedStyles } from "@holochain-open-dev/elements";

import "./plenty/producers/elements/all-producers.js";
import { routerContext } from "./context.js";

@customElement("producers-page")
export class ProducersPage extends SignalWatcher(LitElement) {
  @consume({ context: routerContext, subscribe: true })
  router!: Router;

  routes = new Routes(this, [
    {
      path: "",
      render: () => html`
        <div class="column">
          <all-producers></all-producers>
          <sl-button @click=${() => this.router.goto("/create-producer")}
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
