import { SignalWatcher, pipe } from "@holochain-open-dev/signals";
import { css, LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@holochain-open-dev/profiles/dist/elements/profile-list-item.js";
import { msg, str } from "@lit/localize";
import {
  notifyError,
  Router,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-selection-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";
import "@vaadin/grid/vaadin-grid-column.js";

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
import {
  Producer,
  Product,
  renderPackaging,
} from "./plenty/producers/types.js";
import { appStyles } from "./app-styles.js";
import { mdiFileUpload, mdiPencil, mdiPlus } from "@mdi/js";
import {
  adminRoleConfig,
  RolesStore,
  rolesStoreContext,
} from "@darksoil-studio/roles";
import { SlDialog } from "@shoelace-style/shoelace";
import { processCsvProductsFile } from "./utils.js";
import { GridDataProviderCallback } from "@vaadin/grid";

@customElement("producers-page")
export class ProducersPage extends SignalWatcher(LitElement) {
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  @consume({ context: rolesStoreContext, subscribe: true })
  rolesStore!: RolesStore;

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
            style="flex: 1; width: 50rem"
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
            style="width: 50rem"
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
            style="width: 50rem"
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
            style="width: 50rem"
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
                ${this.producersStore.canIEditProducts(producer.value)
                  ? html`
                      <div class="row" style="gap: 12px">
                        <sl-button
                          @click=${() => {
                            (
                              this.shadowRoot?.getElementById(
                                "upload-products-csv-dialog",
                              ) as SlDialog
                            ).show();
                          }}
                        >
                          <sl-icon
                            .src=${wrapPathInSvg(mdiFileUpload)}
                            slot="prefix"
                          ></sl-icon>
                          ${msg("Import products from CSV file")}</sl-button
                        >
                        <sl-button
                          @click=${() =>
                            this.routes.goto(
                              `${encodeHashToBase64(
                                producerHash,
                              )}/create-product`,
                            )}
                        >
                          <sl-icon
                            .src=${wrapPathInSvg(mdiPlus)}
                            slot="prefix"
                          ></sl-icon>
                          ${msg("Create Product")}</sl-button
                        >
                      </div>
                      ${this.renderUploadProductsCsvDialog(producerHash)}
                    `
                  : html``}
              </div>

              <products-for-producer
                style="flex: 1"
                .producerHash=${producerHash}
                @edit-product-requested=${(e: CustomEvent) =>
                  this.routes.goto(
                    `${encodeHashToBase64(
                      producerHash,
                    )}/products/${encodeHashToBase64(
                      e.detail.productHash,
                    )}/edit`,
                  )}
              ></products-for-producer>
            </div>
          </div>
        `;
    }
  }

  @state()
  uploadedProducts: Array<Omit<Product, "producer_hash">> | undefined;

  @state()
  uploading = false;

  async uploadProducts(
    producerHash: ActionHash,
    products: Array<Omit<Product, "producer_hash">>,
  ) {
    if (this.uploading) return;

    this.uploading = true;

    try {
      await this.producersStore.client.createProducts(
        products.map((p) => ({ ...p, producer_hash: producerHash })),
      );
      (
        this.shadowRoot?.getElementById(
          "upload-products-csv-dialog",
        ) as SlDialog
      ).hide();
      this.uploadedProducts = undefined;
    } catch (e: any) {
      notifyError(msg(str`Error uploading producers: ${e.message}`));
      console.error(e);
    }

    this.uploading = false;
  }

  renderGrid(products: Array<Omit<Product, "producer_hash">>) {
    return html`
      <div class="column" style="gap: 12px; flex: 1">
        <span class="title">${msg("Preview")}</span>
        <vaadin-grid
          multi-sort
          .items=${products}
          style="flex: 1; height: 100%"
        >
          <vaadin-grid-column
            .header=${msg("Product ID")}
            path="product_id"
          ></vaadin-grid-column>
          <vaadin-grid-column
            .header=${msg("Product")}
            path="name"
          ></vaadin-grid-column>
          <vaadin-grid-column
            .header=${msg("Packaging")}
            .renderer=${(root: any, __: any, model: any) => {
              const product: Product = model.item;
              if (product.packaging) {
                root.textContent = renderPackaging(product.packaging);
              } else {
                root.textContent = "";
              }
            }}
          ></vaadin-grid-column>
          <vaadin-grid-sort-column
            .header=${msg("Price without VAT")}
            path="price"
          ></vaadin-grid-sort-column>
          <vaadin-grid-sort-column
            .header=${msg("VAT (%)")}
            path="vat_percentage"
          ></vaadin-grid-sort-column>
        </vaadin-grid>
      </div>
    `;
  }

  renderUploadProductsCsvDialog(producerHash: ActionHash) {
    return html`
      <sl-dialog
        id="upload-products-csv-dialog"
        .label=${msg("Import Products")}
        @sl-hide=${() => (this.uploadedProducts = undefined)}
        style="--width: 800px;"
      >
        <div class="column" style="gap: 16px; flex: 1">
          <span
            >${msg(
              "Upload a CSV file with the products you want to import.",
            )}</span
          >
          <div class="row" style="gap: 12px">
            <input
              type="file"
              accept="csv"
              @change=${async (event: Event) => {
                try {
                  const file = (event.target as any).files[0];
                  if (!file) {
                    this.uploadedProducts = undefined;
                    return;
                  }
                  this.uploadedProducts = await processCsvProductsFile(file);
                } catch (e: any) {
                  notifyError(
                    msg(str`Error processing the CSV file: ${e.message}`),
                  );
                  console.error(e);
                  (event.target! as any).value = "";
                }
              }}
            />
            ${this.uploadedProducts
              ? html`
                  <sl-button @click=${() => (this.uploadedProducts = undefined)}
                    >${msg("Clear")}</sl-button
                  >
                `
              : html``}
          </div>
          ${this.uploadedProducts
            ? this.renderGrid(this.uploadedProducts)
            : html`
                <div class="column" style="gap: 12px">
                  <span>${msg("The CSV must have this format:")}</span>
                  <table style="margin: 16px; width: 600px; align-self: center">
                    <thead>
                      <th>Product ID</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Packaging</th>
                      <th>Price</th>
                      <th>VAT</th>
                    </thead>
                    <tbody>
                      <td>1</td>
                      <td>Rice</td>
                      <td>Beautiful rice</td>
                      <td>rice</td>
                      <td>1x1Kg</td>
                      <td>3 €</td>
                      <td>12%</td>
                    </tbody>
                    <tbody>
                      <td>2</td>
                      <td>Beans</td>
                      <td>Delicious beans</td>
                      <td>bean</td>
                      <td>4x500g</td>
                      <td>8 €</td>
                      <td>15%</td>
                    </tbody>
                  </table>
                </div>
              `}
        </div>

        <sl-button
          slot="footer"
          .loading=${this.uploading}
          .disabled=${!this.uploadedProducts}
          @click=${() =>
            this.uploadProducts(producerHash, this.uploadedProducts!)}
          variant="primary"
          >${msg("Upload Products")}</sl-button
        >
      </sl-dialog>
    `;
  }

  render() {
    return html`
      <div class="column" style="margin: 12px 0">
        <div class="row" style="align-items: center; height: 38px">
          <span class="title">${msg("Producers")}</span>
          <routes-breadcrumbs
            style="margin-left: 24px"
            .routes=${this.routes}
          ></routes-breadcrumbs>
          <span style="flex: 1"></span>
          ${this.routes.currentRoute.get()?.name === msg("All Producers")
            ? html`
                <sl-button @click=${() => this.routes.goto("create-producer")}>
                  <sl-icon
                    .src=${wrapPathInSvg(mdiPlus)}
                    slot="prefix"
                  ></sl-icon>
                  ${msg("Create Producer")}</sl-button
                >
              `
            : html``}
        </div>
        <sl-divider style="--spacing: var(--sl-spacing-small)"></sl-divider>
        ${this.routes.outlet()}
      </div>
    `;
  }

  static styles = [
    ...appStyles,
    css`
      table,
      th,
      td {
        border: 1px solid grey;
        border-collapse: collapse;
        padding: 4px;
      }
      sl-dialog::part(panel) {
        height: 800px;
      }
      sl-dialog::part(body) {
        display: flex;
      }
    `,
  ];
}
