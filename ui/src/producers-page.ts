import { SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { msg } from "@lit/localize";
import { Router, sharedStyles } from "@holochain-open-dev/elements";

import "./plenty/producers/elements/all-producers.js";
import "./plenty/producers/elements/producer-detail.js";
import "./plenty/producers/elements/products-for-producer.js";
import "./routes-breadcrumbs.js";
import { routerContext } from "./context.js";
import { Routes } from "./router.js";
import {
  ActionHash,
  ActionHashB64,
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";
import { producersStoreContext } from "./plenty/producers/context.js";
import { ProducersStore } from "./plenty/producers/producers-store.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { Producer } from "./plenty/producers/types.js";

@customElement("producers-page")
export class ProducersPage extends SignalWatcher(LitElement) {
  @consume({ context: routerContext, subscribe: true })
  router!: Router;

  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

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
      render: (params) =>
        this.renderProducer(
          decodeHashFromBase64(params.producerHash as ActionHashB64),
        ),
    },
  ]);

  canIEdit(producer: EntryRecord<Producer>) {
    const editors = producer.entry.editors;
    if (editors.type === "AllMembers") return true;
    if (editors.type === "Liason")
      return (
        this.producersStore.client.client.myPubKey.toString() ===
        producer.entry.liason.toString()
      );
    return !!editors.members.find(
      (m) =>
        m.toString() === this.producersStore.client.client.myPubKey.toString(),
    );
  }

  renderProducer(producerHash: ActionHash) {
    const producer = this.producersStore.producers
      .get(producerHash)
      .latestVersion.get();

    switch (producer.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "error":
        return html`<display-error
          .error=${producer.error}
          .headline=${msg("Error fetching the producer")}
        ></display-error>`;

      case "completed":
        return html`
          <div class="column" style="gap: 16px">
            <div class="row" style="align-items: center; gap: 12px">
              <show-image
                .imageHash=${producer.value.entry.photo}
                style="height: 100px; width: 100px"
              ></show-image>
              <span class="title">${producer.value.entry.name}</span>
            </div>

            <div class="row" style="margin-top: 8px">
              <span class="title" style="flex: 1">${msg("Products")}</span>
              ${this.canIEdit(producer.value)
                ? html`<sl-button
                    @click=${() =>
                      this.router.goto(
                        `/create-product/${encodeHashToBase64(producerHash)}`,
                      )}
                    >${msg("Create Product")}</sl-button
                  >`
                : html``}
            </div>

            <sl-card>
              <products-for-producer
                style="flex: 1"
                .producerHash=${producerHash}
              ></products-for-producer>
            </sl-card>
          </div>
        `;
    }
  }

  render() {
    return html`
      <div class="column" style="gap: 12px">
        <routes-breadcrumbs .routes=${this.routes}></routes-breadcrumbs>
        ${this.routes.outlet()}
      </div>
    `;
  }

  static styles = sharedStyles;
}
