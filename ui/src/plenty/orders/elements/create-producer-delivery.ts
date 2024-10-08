import { LitElement, css, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  DnaHash,
  AgentPubKey,
  EntryHash,
  encodeHashToBase64,
  decodeHashFromBase64,
  ActionHashB64,
} from "@holochain/client";
import {
  EntryRecord,
  HoloHashMap,
  mapValues,
  pickBy,
  slice,
} from "@holochain-open-dev/utils";
import {
  joinAsyncMap,
  SignalWatcher,
  uniquify,
} from "@holochain-open-dev/signals";
import {
  hashProperty,
  notifyError,
  hashState,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit/context";
import { localized, msg, str } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";
import { GridDataProviderCallback } from "@vaadin/grid";
import { Grid } from "@vaadin/grid/vaadin-grid.js";
import { SlCheckbox, SlInput, SlSelect } from "@shoelace-style/shoelace";
import { ref } from "lit/directives/ref.js";
import { join } from "lit/directives/join.js";

import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import {
  HouseholdOrder,
  ProducerDelivery,
  ProductDelivery,
  ProductOrder,
} from "../types.js";
import { Product, renderPackaging } from "../../producers/types.js";
import { householdsStoreContext } from "../../households/context.js";
import { HouseholdsStore } from "../../households/households-store.js";
import { flatten } from "../../../utils.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { producersStoreContext } from "../../producers/context.js";
import { Household } from "../../households/types.js";
import { styleMap } from "lit/directives/style-map.js";
import { encodeDateToTimeSpec } from "@msgpack/msgpack";

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

  @property()
  householdOrdersHashes!: ActionHash[];

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  @property()
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  @property()
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  @property()
  householdsStore!: HouseholdsStore;

  /**
   * @internal
   */
  @state()
  creatingProducerDelivery = false;

  /**
   * @internal
   */
  @state()
  processingProduct:
    | {
        correctAmount: boolean;
        deliveredAmount: number;
        delivery: ProductDelivery | undefined;
      }
    | undefined;

  /**
   * @internal
   */
  @state()
  processingProductHash: ActionHashB64 | undefined;

  products: Record<
    ActionHashB64,
    {
      correctAmount: boolean;
      deliveredAmount: number;
      delivery: ProductDelivery | undefined;
    }
  > = {};

  async createProducerDelivery() {
    if (this.creatingProducerDelivery) return;
    this.creatingProducerDelivery = true;

    try {
      const products: Record<ActionHashB64, ProductDelivery> = {};
      for (const [productHash, delivery] of Object.entries(this.products)) {
        products[productHash] = delivery.delivery!;
      }
      const producerDelivery =
        await this.ordersStore.client.createProducerDelivery({
          order_hash: this.orderHash,
          producer_hash: this.producerHash,
          products,
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
  }

  productOrdersByHouseholdForProduct(
    productHash: ActionHash,
    householdOrders: ReadonlyMap<ActionHash, EntryRecord<HouseholdOrder>>,
  ) {
    const productOrdersByHousehold = new HoloHashMap<
      ActionHash,
      [number, ProductOrder]
    >();

    for (const [householdOrderHash, householdOrder] of Array.from(
      householdOrders.entries(),
    )) {
      for (const productOrder of householdOrder.entry.products) {
        if (
          encodeHashToBase64(productOrder.original_product_hash) ===
          encodeHashToBase64(productHash)
        ) {
          const orderByThisHousehold = productOrdersByHousehold.get(
            householdOrder.entry.household_hash,
          );
          if (
            !orderByThisHousehold ||
            orderByThisHousehold[0] < householdOrder.action.timestamp
          ) {
            productOrdersByHousehold.set(householdOrder.entry.household_hash, [
              householdOrder.action.timestamp,
              productOrder,
            ]);
          }
        }
      }
    }

    return productOrdersByHousehold;
  }

  renderProductTab(
    productHash: ActionHash,
    product: EntryRecord<Product>,
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>,
    householdOrders: ReadonlyMap<ActionHash, EntryRecord<HouseholdOrder>>,
  ) {
    const productDelivery =
      this.processingProductHash === encodeHashToBase64(productHash)
        ? this.processingProduct
        : this.products[encodeHashToBase64(productHash)];

    const productOrdersByHousehold = this.productOrdersByHouseholdForProduct(
      productHash,
      householdOrders,
    );
    const totalAmountOrdered = Array.from(
      productOrdersByHousehold.values(),
    ).reduce((acc, next) => acc + next[1].amount, 0);

    const errorInProcessing = this.errorInProcessing(productHash);
    return html`
      <div class="column" style="gap: 12px; flex:1">
        <div class="row" style="gap: 12px;">
          <div class="column" style="gap: 12px; flex: 1">
            <div class="row" style="gap: 12px;">
              <span>${msg("Product:")}</span>
              <span>${product.entry.name}</span>
            </div>
            <div class="row" style="gap: 12px;">
              <span>${msg("Price:")}</span>
              <span>${product.entry.price_cents * 100}</span>
            </div>
            <div class="row" style="gap: 12px;">
              <span>${msg("Packaging:")}</span>
              <span>${renderPackaging(product.entry.packaging)}</span>
            </div>
            <div class="row" style="gap: 12px;">
              <span>${msg("Amount Ordered:")}</span>
              <span>${totalAmountOrdered}</span>
            </div>
          </div>
        </div>

        <div
          class="row"
          style="align-items: center; gap: 12px; margin-top: 12px"
        >
          <span class="title">${msg("Product Delivery")}</span>
          <span style="flex: 1"></span>
        </div>
        <sl-divider style="--spacing:0"></sl-divider>
        <div class="column" style="gap: 24px;">
          <sl-tooltip
            placement="right"
            trigger="manual"
            .content=${msg("Select one of the options")}
            .open=${this.errorInProcessing(productHash) ===
            "product-delivered-not-set"}
          >
            <sl-select
              style="width: 20em"
              .label=${msg("Was the product delivered correctly?")}
              @sl-change=${(e: CustomEvent) => {
                const value = (e.target as SlSelect).value as
                  | "Missing"
                  | "Delivered";
                switch (value) {
                  case "Missing":
                    this.processingProduct!.delivery = {
                      type: "Missing",
                    };
                    break;
                  case "Delivered":
                    this.processingProduct!.delivery = {
                      type: "Delivered",
                      delivered_amount: {
                        type: "FixedAmountProduct",
                        delivered_products: Array.from(
                          productOrdersByHousehold.entries(),
                        ).map(([householdHash, productOrder]) => ({
                          amount: productOrder[1].amount,
                          households_hashes: [householdHash],
                        })),
                        price_cents_per_unit_changed: undefined,
                      },
                      comment: undefined,
                    };
                    break;
                }
                this.requestUpdate();
              }}
            >
              <sl-option value="Delivered">${msg("Delivered")}</sl-option>
              <sl-option value="Missing"
                >${msg("Product is missing")}</sl-option
              >
            </sl-select>
          </sl-tooltip>

          <div
            class="column"
            style=${styleMap({
              display:
                productDelivery?.delivery?.type === "Delivered"
                  ? "flex"
                  : "none",
              gap: "24px",
            })}
          >
            <div class="column" style="gap: 12px">
              <span
                >${msg(
                  "Was the product delivered in the correct amount?",
                )}</span
              >
              <div class="row" style="align-items: center; gap: 12px">
                <sl-checkbox
                  .checked=${!productDelivery || productDelivery.correctAmount}
                  @sl-change=${(e: CustomEvent) => {
                    const checked = (e.target as SlCheckbox).checked;
                    this.processingProduct!.correctAmount = checked;
                    this.processingProduct!.deliveredAmount =
                      totalAmountOrdered;
                    this.requestUpdate();
                  }}
                  >${msg("Correct amount")}</sl-checkbox
                >
                <span
                  style=${styleMap({
                    opacity:
                      !productDelivery || productDelivery?.correctAmount
                        ? "0"
                        : "1",
                  })}
                  >${msg("Actual amount delivered")}</span
                >
                <sl-input
                  style=${styleMap({
                    opacity:
                      !productDelivery || productDelivery?.correctAmount
                        ? "0"
                        : "1",
                  })}
                  type="number"
                  .value=${productDelivery?.deliveredAmount
                    ? productDelivery.deliveredAmount
                    : totalAmountOrdered}
                  @input=${(e: InputEvent) => {
                    const value = parseInt((e.target as SlInput).value);
                    this.processingProduct!.deliveredAmount = value;
                    this.requestUpdate();
                  }}
                ></sl-input>
              </div>
            </div>

            <div class="column" style="gap: 12px">
              <span>${msg("How many does each household get?")}</span>
              <table style="width: 500px;">
                <thead>
                  <th style="text-align: left; font-weight: normal">
                    ${msg("Household")}
                  </th>

                  <th style="text-align: center; font-weight: normal">
                    ${msg("Amount ordered")}
                  </th>
                  <th style="text-align: center; font-weight: normal">
                    ${msg("Amount they will receive")}
                  </th>
                </thead>
                <tbody>
                  ${Array.from(productOrdersByHousehold.entries()).map(
                    ([householdHash, productOrder]) => html`
                      <tr>
                        <td>
                          <div
                            class="row"
                            style="gap: 12px; align-items: center"
                          >
                            <show-image
                              style="width: 32px; height: 32px;"
                              .imageHash=${households.get(householdHash)!.entry
                                .avatar}
                            ></show-image>
                            <span style="flex:1"
                              >${households.get(householdHash)!.entry
                                .name}</span
                            >
                          </div>
                        </td>
                        <td style="text-align: center">
                          ${productOrder[1].amount}
                        </td>
                        <td style="text-align: center">
                          <div class="column" style="width: 100%">
                            <sl-input
                              type="number"
                              style="width: 6em; align-self: center"
                              .value=${productDelivery?.delivery?.type ===
                                "Delivered" &&
                              productDelivery.delivery.delivered_amount.type ===
                                "FixedAmountProduct" &&
                              productDelivery.delivery.delivered_amount.delivered_products.find(
                                (d) =>
                                  !!d.households_hashes.find(
                                    (h) =>
                                      encodeHashToBase64(h) ===
                                      encodeHashToBase64(householdHash),
                                  ),
                              )
                                ? productDelivery.delivery.delivered_amount.delivered_products.find(
                                    (d) =>
                                      !!d.households_hashes.find(
                                        (h) =>
                                          encodeHashToBase64(h) ===
                                          encodeHashToBase64(householdHash),
                                      ),
                                  )?.amount
                                : productOrder[1].amount}
                              @input=${(e: InputEvent) => {
                                const value = parseInt(
                                  (e.target as SlInput).value,
                                );
                                if (
                                  productDelivery?.delivery?.type ===
                                    "Delivered" &&
                                  productDelivery?.delivery?.delivered_amount
                                    .type === "FixedAmountProduct"
                                ) {
                                  const deliveryForThisHousehold =
                                    productDelivery.delivery.delivered_amount.delivered_products.find(
                                      (d) =>
                                        d.households_hashes.find(
                                          (h) =>
                                            encodeHashToBase64(h) ===
                                            encodeHashToBase64(householdHash),
                                        ),
                                    );
                                  if (deliveryForThisHousehold) {
                                    deliveryForThisHousehold.amount = value;
                                  } else {
                                    productDelivery.delivery.delivered_amount.delivered_products.push(
                                      {
                                        amount: value,
                                        households_hashes: [householdHash],
                                      },
                                    );
                                  }
                                }

                                this.requestUpdate();
                              }}
                            >
                            </sl-input>
                          </div>
                        </td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
            <sl-tooltip
              placement="right"
              trigger="manual"
              .content=${msg(
                "The sum given to each household is incorrect: add a comment explaining why.",
              )}
              .open=${this.errorInProcessing(productHash) ===
              "households-amount-mismatch-without-comment"}
            >
              <sl-textarea
                style="flex: 1; "
                .label=${msg("Additional comment")}
                @input=${(e: InputEvent) => {
                  const comment = (e.target as SlInput).value;
                  if (productDelivery?.delivery?.type === "Delivered") {
                    productDelivery.delivery.comment =
                      comment === "" ? undefined : comment;
                  }
                  this.requestUpdate();
                }}
              ></sl-textarea>
            </sl-tooltip>
          </div>
        </div>
      </div>
    `;
  }

  errorInProcessing(
    productHash: ActionHash,
  ):
    | "product-delivered-not-set"
    | "households-amount-mismatch-without-comment"
    | undefined {
    const product = this.products[encodeHashToBase64(productHash)];
    if (!product) return undefined;
    // if (!product.delivery) return msg("Was the product delivered?");
    if (!product.delivery) return "product-delivered-not-set";
    if (product.delivery.type === "Delivered") {
      if (product.delivery.delivered_amount.type === "FixedAmountProduct") {
        const actualAmount = product.deliveredAmount;
        const sum = product.delivery.delivered_amount.delivered_products.reduce(
          (acc, next) => acc + next.amount,
          0,
        );
        if (actualAmount !== sum && product.delivery.comment === undefined)
          return "households-amount-mismatch-without-comment";
        //           return msg(
        //   ,
        // );
      }
    }

    return undefined;
  }

  renderTag(productHash: ActionHash) {
    const product = this.products[encodeHashToBase64(productHash)];
    if (!product) return html`<sl-tag style="opacity: 0"></sl-tag>`;

    const error = this.errorInProcessing(productHash);

    if (error) return html`<sl-tag>${msg("Incomplete")}</sl-tag>`;

    switch (product.delivery!.type) {
      case "Delivered":
        return html`<sl-tag variant="success">${msg("Delivered")}</sl-tag>`;
      case "Missing":
        return html`<sl-tag variant="warning">${msg("Missing")}</sl-tag>`;
    }
  }

  renderProducts(
    products: ReadonlyMap<ActionHash, EntryRecord<Product>>,
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>,
    allHouseholdsOrders: ReadonlyMap<ActionHash, EntryRecord<HouseholdOrder>>,
  ) {
    const errorInProcessing = Object.keys(this.products).find(
      (productHash) =>
        this.errorInProcessing(decodeHashFromBase64(productHash)) !== undefined,
    );
    const productsRemaining = products.size - Object.keys(this.products).length;
    return html`
      <sl-card style="flex: 1; --padding: 0; width: 1000px">
        <div class="column" style="flex: 1;">
          <div
            class="row"
            style="align-items: center; gap: 12px; margin: 12px; "
          >
            <span class="title" style="flex: 1">${msg("Products")}</span>

            ${errorInProcessing
              ? html`
                  <span
                    >${msg(
                      str`Product "${products.get(decodeHashFromBase64(errorInProcessing))!.entry.name}" is incomplete.`,
                    )}</span
                  >
                `
              : productsRemaining !== 0
                ? html`<span class="placeholder"
                    >${msg(str`${productsRemaining} products remaining`)}</span
                  >`
                : html`<span class="placeholder"
                    >${msg("All products done")}</span
                  >`}

            <sl-button
              .loading=${this.creatingProducerDelivery}
              variant="primary"
              .disabled=${errorInProcessing !== undefined ||
              productsRemaining !== 0}
              @click=${async () => {
                this.createProducerDelivery();
              }}
              >${msg("Process Delivery")}</sl-button
            >
          </div>
          <sl-divider style="--spacing:0; "></sl-divider>
          <sl-tab-group
            placement="start"
            style="flex: 1"
            ${ref(() => {
              if (!this.processingProductHash) {
                this.processingProductHash = encodeHashToBase64(
                  Array.from(products.keys())[0],
                );
                const productOrdersByHousehold =
                  this.productOrdersByHouseholdForProduct(
                    decodeHashFromBase64(this.processingProductHash),
                    allHouseholdsOrders,
                  );
                const totalAmountOrdered = Array.from(
                  productOrdersByHousehold.values(),
                ).reduce((acc, next) => acc + next[1].amount, 0);
                this.processingProduct = {
                  deliveredAmount: totalAmountOrdered,
                  correctAmount: true,
                  delivery: undefined,
                };
              }
            })}
            @sl-tab-show=${(e: CustomEvent) => {
              if (this.processingProductHash && this.processingProduct) {
                this.products[this.processingProductHash] =
                  this.processingProduct;
              }

              const newProductHash: ActionHashB64 = e.detail.name;

              if (this.products[newProductHash]) {
                this.processingProduct = this.products[newProductHash];
              } else {
                const productOrdersByHousehold =
                  this.productOrdersByHouseholdForProduct(
                    decodeHashFromBase64(newProductHash),
                    allHouseholdsOrders,
                  );
                const totalAmountOrdered = Array.from(
                  productOrdersByHousehold.values(),
                ).reduce((acc, next) => acc + next[1].amount, 0);
                this.processingProduct = {
                  deliveredAmount: totalAmountOrdered,
                  correctAmount: true,
                  delivery: undefined,
                };
              }
              this.processingProductHash = newProductHash;
            }}
          >
            ${Array.from(products.entries()).map(
              ([productHash, product]) => html`
                <sl-tab-panel
                  name="${encodeHashToBase64(productHash)}"
                  style="padding: 16px"
                  >${this.renderProductTab(
                    productHash,
                    product,
                    households,
                    allHouseholdsOrders,
                  )}</sl-tab-panel
                >
                <sl-tab panel="${encodeHashToBase64(productHash)}" slot="nav">
                  <div
                    class="row"
                    style="align-items: center; gap: 12px; width: 15em"
                  >
                    <span style="flex: 1; overflow: hidden">
                      ${product.entry.name}
                    </span>
                    ${this.renderTag(productHash)}
                  </div>
                </sl-tab>
              `,
            )}
          </sl-tab-group>
        </div></sl-card
      >
    `;
  }

  productsAndHouseholdOrders() {
    const householdOrders = joinAsyncMap(
      mapValues(
        slice(this.ordersStore.householdOrders, this.householdOrdersHashes),
        (h) => h.latestVersion.get(),
      ),
    );
    if (householdOrders.status !== "completed") return householdOrders;

    const allHouseholdsHashes = uniquify(
      Array.from(householdOrders.value.values()).map(
        (ho) => ho.entry.household_hash,
      ),
    );

    const households = joinAsyncMap(
      mapValues(
        slice(this.householdsStore.households, allHouseholdsHashes),
        (h) => h.latestVersion.get(),
      ),
    );

    const allProductsHashes = uniquify(
      flatten(
        Array.from(householdOrders.value.values()).map((ho) =>
          ho.entry.products.map((p) => p.original_product_hash),
        ),
      ),
    );

    const products = joinAsyncMap(
      mapValues(slice(this.producersStore.products, allProductsHashes), (h) =>
        h.latestVersion.get(),
      ),
    );
    if (households.status !== "completed") return households;
    if (products.status !== "completed") return products;

    const productsForThisProducer = pickBy(
      products.value,
      (product) =>
        encodeHashToBase64(product.entry.producer_hash) ===
        encodeHashToBase64(this.producerHash),
    );

    return {
      status: "completed" as const,
      value: {
        products: productsForThisProducer,
        householdOrders: householdOrders.value,
        households: households.value,
      },
    };
  }

  render() {
    const details = this.productsAndHouseholdOrders();

    switch (details.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the order details")}
          .error=${details.error}
        ></display-error>`;
      case "completed":
        return this.renderProducts(
          details.value.products,
          details.value.households,
          details.value.householdOrders,
        );
    }
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
