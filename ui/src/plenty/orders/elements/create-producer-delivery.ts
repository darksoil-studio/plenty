import { LitElement, css, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
  encodeHashToBase64,
  decodeHashFromBase64,
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
import { GridDataProviderCallback } from "@vaadin/grid";
import { Grid } from "@vaadin/grid/vaadin-grid.js";
import { SlInput, SlSelect } from "@shoelace-style/shoelace";
import { ref } from "lit/directives/ref.js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";

import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";

import "../../../vaadin-grid-form-field-column.js";

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
import { Product, renderPackaging } from "../../producers/types.js";

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
  items!: Array<any>;

  render() {
    const dataProvider: GridDataProviderCallback<any> = (
      params: any,
      callback: any,
    ) => {
      const items = params.parentItem?.children || this.items;
      callback(items, items.length);
    };
    return html`
      <div class="column" style="width: 1200px;">
        <sl-card style="flex: 1">
          <div class="column" style="flex: 1; margin: -20px">
            <vaadin-grid
              style="flex: 1"
              .expandedItems=${this.items}
              .dataProvider=${dataProvider}
              ${ref((el) => {
                // Workaround https://github.com/shoelace-style/shoelace/issues/418
                if (!el) return;
                const grid = el as Grid;
                const fixZindex = () => {
                  const trs = grid.shadowRoot?.querySelectorAll("tr");
                  if (!trs) return;
                  const trsArray = Array.from(trs);
                  for (let i = 0; i < trs.length; i++) {
                    trsArray[i].style.zIndex = `${trs.length - i}`;
                  }
                };
                setInterval(() => {
                  fixZindex();
                }, 1000);
                setTimeout(() => {
                  fixZindex();
                });
              })}
            >
              <vaadin-grid-tree-column
                .header=${msg("Product")}
                path="name"
                width="300px"
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
                  model.item.householdHash
                    ? `${encodeHashToBase64(model.item.productHash)}-household-${encodeHashToBase64(model.item.householdHash)}`
                    : encodeHashToBase64(model.item.productHash)}
                .templateRenderer=${(
                  id: string,
                  value: ProductDelivery,
                  setValue: (value: ProductDelivery) => void,
                ) => {
                  console.log(id);
                  if (
                    id.includes("household") &&
                    (!value || value.type === "Delivered")
                  ) {
                    const productHash = id.split("-household-")[0];
                    const householdHash = id.split("-household-")[1];

                    const product = this.items.find(
                      (i) => encodeHashToBase64(i.productHash) === productHash,
                    );

                    const orderedAmount: number = product.children
                      .filter(
                        (c: any) =>
                          encodeHashToBase64(c.householdHash) === householdHash,
                      )
                      .reduce(
                        (acc: number, next: any) => acc + next.amount_ordered,
                        0,
                      );

                    let inputValue = orderedAmount;
                    if (value) {
                      if (
                        value.delivered_amount.type === "FixedAmountProduct"
                      ) {
                        inputValue = value.delivered_amount.delivered_products
                          .filter((dp) =>
                            dp.households_hashes.find(
                              (h) => encodeHashToBase64(h) === householdHash,
                            ),
                          )
                          .reduce((acc, next) => acc + next.amount, 0);
                      } else {
                      }
                    }
                    return html` <div
                      class="row"
                      style="align-items: center; gap: 12px"
                    >
                      <span style="width: 12em"></span>
                      <sl-input
                        type="number"
                        min="0"
                        step="1"
                        style="width: 5em"
                        .value=${inputValue}
                        @sl-change=${(e: CustomEvent) => {}}
                      ></sl-input>
                    </div>`;
                  }

                  const type = value?.type || "Delivered";
                  return html`
                    <div class="row" style="align-items: center; gap: 8px;">
                      <sl-select
                        style="width: 10em"
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
                          ? html`<sl-checkbox
                              checked
                              @sl-change=${(e: CustomEvent) => {
                                const problem = (e.target as SlInput).value;
                                setValue({
                                  type: "Problem",
                                  problem,
                                });
                              }}
                              >${msg("Correct Amount")}</sl-checkbox
                            >`
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

  static styles = [
    ...appStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
