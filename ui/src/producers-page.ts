import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import { msg } from "@lit/localize";
import { Router, sharedStyles } from "@holochain-open-dev/elements";

import "./plenty/producers/elements/all-producers.js";
import "./plenty/producers/elements/producer-detail.js";
import "./routes-breadcrumbs.js";
import { routerContext } from "./context.js";
import { Routes } from "./router.js";
import { decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";

@customElement("producers-page")
export class ProducersPage extends SignalWatcher(LitElement) {
  @consume({ context: routerContext, subscribe: true })
  router!: Router;

  routes = new Routes(this, [
    {
      path: "",
      name: msg("All Producers"),
      render: () => html`
        <div class="column">
          <all-producers
            @producer-selected=${(e: CustomEvent) =>
              this.routes.goto(encodeHashToBase64(e.detail.producerHash))}
          ></all-producers>
          <sl-button @click=${() => this.router.goto("/create-producer")}
            >${msg("Create Producer")}</sl-button
          >
        </div>
      `,
    },
    {
      path: ":producerHash",
      render: (params) => html`
        <producer-detail
          .producerHash=${decodeHashFromBase64(params.producerHash as any)}
        ></producer-detail>
      `,
    },
  ]);

  render() {
    return html`
      <div class="column">
        <routes-breadcrumbs .routes=${this.routes}></routes-breadcrumbs>
        ${this.routes.outlet()}
      </div>
    `;
  }

  static styles = sharedStyles;
}
