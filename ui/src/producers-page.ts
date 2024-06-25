import { SignalWatcher, pipe } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit/context";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@holochain-open-dev/profiles/dist/elements/profile-list-item.js";
import { msg } from "@lit/localize";
import {
  Router,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";

import "./plenty/producers/elements/all-producers.js";
import "./plenty/producers/elements/producer-detail.js";
import "./plenty/producers/elements/edit-product.js";
import "./plenty/producers/elements/products-for-producer.js";
import "./routes-breadcrumbs.js";
import "./overlay-page.js";
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
import { appStyles } from "./app-styles.js";
import { mdiPencil } from "@mdi/js";

@customElement("producers-page")
export class ProducersPage extends SignalWatcher(LitElement) {
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
        </div>
      `,
    },
    {
      path: "create-producer",
      render: () => html`
        <overlay-page
          .title=${msg("Create Producer")}
          @close-requested=${() => this.routes.pop()}
        >
          <create-producer
            style="flex: 1"
            @close-requested=${() => this.routes.pop()}
            @producer-created=${(e: CustomEvent) => {
              this.routes.goto(`${encodeHashToBase64(e.detail.producerHash)}`);
            }}
          ></create-producer>
        </overlay-page>
      `,
    },
    {
      path: ":producerHash",
      nameSignal: (params) =>
        pipe(
          this.producersStore.producers.get(
            decodeHashFromBase64(params.producerHash as ActionHashB64),
          ).latestVersion,
          (producer) => producer.entry.name,
        ),
      render: (params) =>
        this.renderProducer(
          decodeHashFromBase64(params.producerHash as ActionHashB64),
        ),
    },
    {
      path: ":producerHash/edit",
      render: (params) => html`
        <overlay-page
          .title=${msg("Edit Producer")}
          @close-requested=${() => {
            this.routes.pop();
          }}
        >
          <edit-producer
            .producerHash=${decodeHashFromBase64(
              params.producerHash as ActionHashB64,
            )}
            @edit-canceled=${() => this.routes.pop()}
            @producer-updated=${(e: CustomEvent) => {
              this.routes.pop();
            }}
          ></edit-producer>
        </overlay-page>
      `,
    },
    {
      path: ":producerHash/products/:productHash",
      enter: (params) => {
        this.routes.goto(`${params.producerHash}`);
        return false;
      },
    },
    {
      path: ":producerHash/products/:productHash/",
      enter: (params) => {
        this.routes.goto(`${params.producerHash}`);
        return false;
      },
    },
    {
      path: ":producerHash/products/:productHash/edit",
      render: (params) => html`
        <overlay-page
          .title=${msg("Edit Product")}
          @close-requested=${() => {
            this.routes.pop();
          }}
        >
          <edit-product
            .productHash=${decodeHashFromBase64(
              params.productHash as ActionHashB64,
            )}
            @edit-canceled=${() => this.routes.pop()}
            @product-updated=${(e: CustomEvent) => {
              this.routes.pop();
            }}
          ></edit-product>
        </overlay-page>
      `,
    },
    {
      path: ":producerHash/create-product",
      render: (params) => html`
        <overlay-page
          .title=${msg("Create Product")}
          @close-requested=${() => this.routes.pop()}
        >
          <create-product
            .producerHash=${decodeHashFromBase64(
              params.producerHash as ActionHashB64,
            )}
            @product-created=${(e: CustomEvent) => {
              this.routes.pop();
            }}
          ></create-product>
        </overlay-page>
      `,
    },
  ]);

  renderProduct() {
    return html``;
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
          <div class="column" style="align-items: center">
            <div class="column" style="gap: 16px; width: 1000px;">
              <div class="row" style="align-items: center; gap: 12px; flex: 1">
                <show-image
                  .imageHash=${producer.value.entry.photo}
                  style="height: 100px; width: 100px"
                ></show-image>
                <div class="column" style="gap: 12px">
                  <span class="title">${producer.value.entry.name}</span>

                  <div class="row" style="gap: 8px; align-items: center">
                    <span>${msg("Liason")}:</span>
                    <profile-list-item
                      .agentPubKey=${producer.value.entry.liason}
                    ></profile-list-item>
                  </div>
                </div>

                <span style="flex: 1"></span>

                ${this.producersStore.canIEdit(producer.value)
                  ? html`<sl-button
                      @click=${() =>
                        this.routes.goto(
                          `${encodeHashToBase64(producerHash)}/edit`,
                        )}
                      style="align-self: start"
                    >
                      <sl-icon
                        slot="prefix"
                        .src=${wrapPathInSvg(mdiPencil)}
                      ></sl-icon>
                      ${msg("Edit Producer")}</sl-button
                    >`
                  : html``}
              </div>

              <div class="row" style="margin-top: 8px; align-items: center">
                <span class="title" style="flex: 1">${msg("Products")}</span>
                ${this.producersStore.canIEdit(producer.value)
                  ? html`<sl-button
                      @click=${() =>
                        this.routes.goto(
                          `${encodeHashToBase64(producerHash)}/create-product`,
                        )}
                      >${msg("Create Product")}</sl-button
                    >`
                  : html``}
              </div>

              <products-for-producer
                style="flex: 1"
                .producerHash=${producerHash}
                @edit-product-requested=${(e: CustomEvent) =>
                  this.routes.goto(
                    `${encodeHashToBase64(producerHash)}/products/${encodeHashToBase64(e.detail.productHash)}/edit`,
                  )}
              ></products-for-producer>
            </div>
          </div>
        `;
    }
  }

  render() {
    return html`
      <div class="column" style=" margin: 12px 0">
        <div class="row" style="align-items: center; height: 38px">
          <span class="title">${msg("Producers")}</span>
          <routes-breadcrumbs
            style="margin-left: 24px"
            .routes=${this.routes}
          ></routes-breadcrumbs>
          <span style="flex: 1"></span>
          ${this.routes.currentRoute.get()?.name === msg("All Producers")
            ? html`
                <sl-button @click=${() => this.routes.goto("create-producer")}
                  >${msg("Create Producer")}</sl-button
                >
              `
            : html``}
        </div>
        <sl-divider style="--spacing: var(--sl-spacing-small)"></sl-divider>
        ${this.routes.outlet()}
      </div>
    `;
  }

  static styles = [...appStyles];
}
