import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
  encodeHashToBase64,
} from "@holochain/client";
import { EntryRecord, HoloHashMap } from "@holochain-open-dev/utils";
import { SignalWatcher } from "@holochain-open-dev/signals";
import {
  hashProperty,
  notifyError,
  hashState,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { ProducerDelivery, ProductDelivery } from "../types.js";
import { GridDataProviderCallback } from "@vaadin/grid";
import { Product, renderPackaging } from "../../producers/types.js";
import { SlInput, SlSelect } from "@shoelace-style/shoelace";

/**
 * @element create-producer-delivery
 * @fires producer-delivery-created: detail will contain { producerDeliveryHash }
 */
@localized()
@customElement("create-producer-delivery")
export class CreateProducerDelivery extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this ProducerDelivery
   */
  @property(hashProperty("order-hash"))
  orderHash!: ActionHash;

  /**
   * REQUIRED. The producer hash for this ProducerDelivery
   */
  @property(hashProperty("producer-hash"))
  producerHash!: ActionHash;

  /**
   * REQUIRED. The products for this ProducerDelivery
   */
  @property()
  products!: Array<ActionHash>;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @state()
  creatingProducerDelivery = false;

  @property()
  dataProvider!: GridDataProviderCallback<any>;

  render() {
    return html`
      <div class="column" style="width: 1200px; padding: 16px">
        <sl-card style="flex: 1">
          <div class="column" style="flex: 1; margin: -20px">
            <vaadin-grid .dataProvider=${this.dataProvider}>
              <vaadin-grid-tree-column
                .header=${msg("Product")}
                path="name"
              ></vaadin-grid-tree-column>
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
                .header=${msg("Price")}
                path="price_with_vat"
              ></vaadin-grid-sort-column>
              <vaadin-grid-column
                .header=${msg("Amount Ordered")}
                path="amount_ordered"
              ></vaadin-grid-column>
              <vaadin-grid-form-field-column
                width="600px"
                .header=${msg("Delivery")}
                .getId=${(model: any) =>
                  encodeHashToBase64(model.item.productHash)}
                .templateRenderer=${(
                  id: string,
                  value: ProductDelivery,
                  setValue: (value: ProductDelivery) => void,
                ) => {
                  const type = value?.type || "Delivered";
                  return html`
                    <div style="display: flex; flex-direction: row; gap: 8px">
                      <sl-select
                        hoist
                        .value=${type}
                        @sl-change=${(e: CustomEvent) => {
                          const value = (e.target as SlSelect).value as
                            | "Missing"
                            | "Delivered"
                            | "Problem";
                          switch (value) {
                            case "Missing":
                              setValue({
                                type: "Missing",
                              });
                              break;
                            case "Delivered":
                              // setValue({

                              //   type: 'Delivered',
                              //   delivered_amount: {

                              //   }
                              // });
                              break;
                            case "Problem":
                              setValue({
                                type: "Problem",
                                problem: "",
                              });
                              break;
                          }
                        }}
                      >
                        <sl-option value="Delivered"
                          >${msg("Delivered")}</sl-option
                        >
                        <sl-option value="Missing">${msg("Missing")}</sl-option>
                        <sl-option value="Problem">${msg("Problem")}</sl-option>
                      </sl-select>

                      ${type === "Problem"
                        ? html`<sl-input
                            .placeholder=${msg("What happened?")}
                            @sl-change=${(e: CustomEvent) => {
                              const problem = (e.target as SlInput).value;
                              setValue({
                                type: "Problem",
                                problem,
                              });
                            }}
                          ></sl-input>`
                        : type === "Delivered"
                          ? html`<sl-input
                              .placeholder=${msg("What happened?")}
                              @sl-change=${(e: CustomEvent) => {
                                const problem = (e.target as SlInput).value;
                                setValue({
                                  type: "Problem",
                                  problem,
                                });
                              }}
                            ></sl-input>`
                          : html``}
                    </div>
                  `;
                }}
              >
              </vaadin-grid-form-field-column>
            </vaadin-grid>
            <div style="display: flex; flex-direction: row; padding: 16px">
              <span style="flex: 1"></span>
              <sl-button
                .loading=${this.creatingProducerDelivery}
                variant="primary"
                @click=${async () => {
                  if (this.creatingProducerDelivery) return;
                  this.creatingProducerDelivery = true;

                  try {
                    const producerDelivery =
                      await this.ordersStore.client.createProducerDelivery({
                        order_hash: this.orderHash,
                        producer_hash: this.producerHash,
                        products: {},
                      });
                    this.dispatchEvent(
                      new CustomEvent("producer-delivery-created", {
                        bubbles: true,
                        detail: producerDelivery,
                        composed: true,
                      }),
                    );
                  } catch (e) {
                    console.error(e);
                    notifyError(msg("Error creating the producer delivery."));
                  }

                  this.creatingProducerDelivery = false;
                }}
                >${msg("Process Delivery")}</sl-button
              >
            </div>
          </div>
        </sl-card>
      </div>
    `;
  }

  static styles = appStyles;
}
