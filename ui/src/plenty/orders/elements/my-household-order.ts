import { css, LitElement, html, render } from "lit";
import { cache } from "lit/directives/cache.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
  encodeHashToBase64,
} from "@holochain/client";
import {
  EntryRecord,
  HoloHashMap,
  LazyHoloHashMap,
  mapValues,
  slice,
} from "@holochain-open-dev/utils";
import {
  SignalWatcher,
  joinAsync,
  joinAsyncMap,
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
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";
import { SlInput } from "@shoelace-style/shoelace";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-selection-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";

import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";

import { appStyles } from "../../../app-styles.js";
import { OrdersStore } from "../orders-store.js";
import { ordersStoreContext } from "../context.js";
import { AvailableProducts, HouseholdOrder, ProductOrder } from "../types.js";
import { Household } from "../../households/types.js";
import { HouseholdsStore } from "../../households/households-store.js";
import { householdsStoreContext } from "../../households/context.js";
import { Producer, Product, renderPackaging } from "../../producers/types.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { producersStoreContext } from "../../producers/context.js";

const productsRandom = new LazyHoloHashMap(() => Math.random() * 1000);

/**
 * @element my-household-order
 * @fires household-order-created: detail will contain { householdOrderHash }
 */
@localized()
@customElement("my-household-order")
export class MyHouseholdOrder extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The order hash for this HouseholdOrder
   */
  @property(hashProperty("order-hash"))
  orderHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  /**
   * @internal
   */
  @query("#create-form")
  form!: HTMLFormElement;

  productOrdersQueue = new HoloHashMap<ActionHash, ProductOrder>();

  async setHouseholdProductOrder(
    householdHash: ActionHash,
    previousOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined
  ) {
    if (this.orderHash === undefined)
      throw new Error(
        "Cannot create a new Household Order without its order_hash field"
      );

    try {
      this.committing = true;

      if (!previousOrder) {
        const householdOrder: HouseholdOrder = {
          household_hash: householdHash,
          order_hash: this.orderHash,
          products: Array.from(this.productOrdersQueue.values()),
        };
        const record: EntryRecord<HouseholdOrder> =
          await this.ordersStore.client.createHouseholdOrder(householdOrder);

        this.dispatchEvent(
          new CustomEvent("household-order-created", {
            composed: true,
            bubbles: true,
            detail: {
              householdOrderHash: record.actionHash,
            },
          })
        );
      } else {
        const queuedProducts = Array.from(this.productOrdersQueue.values()).map(
          (p) => encodeHashToBase64(p.original_product_hash)
        );
        let products = previousOrder[1].entry.products.filter(
          (p) =>
            !queuedProducts.includes(
              encodeHashToBase64(p.original_product_hash)
            )
        );
        products = [
          ...products,
          ...Array.from(this.productOrdersQueue.values()),
        ];
        const householdOrder: HouseholdOrder = {
          order_hash: this.orderHash!,
          household_hash: householdHash!,
          products,
        };
        const record: EntryRecord<HouseholdOrder> =
          await this.ordersStore.client.updateHouseholdOrder(
            previousOrder[0],
            previousOrder[1].actionHash,
            householdOrder
          );

        this.dispatchEvent(
          new CustomEvent("household-order-created", {
            composed: true,
            bubbles: true,
            detail: {
              householdOrderHash: record.actionHash,
            },
          })
        );
      }
    } catch (e: unknown) {
      console.warn(e);
      // notifyError(msg("Error updating the household order"));
      setTimeout(
        () => this.setHouseholdProductOrder(householdHash, previousOrder),
        100
      );
    }
    this.committing = false;
  }

  getProductsLatestVersion(availableProducts: EntryRecord<AvailableProducts>) {
    if (availableProducts.entry.producer_availability.type !== "Available")
      return {
        status: "error" as const,
        error: msg("This producer is not available."),
      };

    const map = slice(
      this.producersStore.products,
      availableProducts.entry.producer_availability.available_products
    );

    return joinAsyncMap(
      mapValues(map, (product) => product.latestVersion.get())
    );
  }

  renderProducerProducts(
    myHouseholdHash: ActionHash,
    myHouseholdOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined,
    producerHash: ActionHash,
    producer: EntryRecord<Producer>,
    availableProducts: EntryRecord<AvailableProducts>
  ) {
    const products = this.getProductsLatestVersion(availableProducts);

    switch (products.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the products for this producer")}
          .error=${products.error}
        ></display-error>`;
      case "completed":
        return html`
          <vaadin-grid
            multi-sort
            .items=${Array.from(products.value.entries()).map(
              ([productHash, p]) => ({
                ...p.entry,
                productHash,
                actionHash: p.actionHash,
              })
            )}
            style="flex: 1; height: 100%"
          >
            <vaadin-grid-column
              .header=${msg("Name")}
              path="name"
            ></vaadin-grid-column>
            <vaadin-grid-column
              .header=${msg("Packaging")}
              .renderer=${(root: any, __: any, model: any) => {
                const product: Product = model.item;
                root.textContent = renderPackaging(product.packaging);
              }}
            ></vaadin-grid-column>
            <vaadin-grid-sort-column
              .header=${msg("Price")}
              path="price"
            ></vaadin-grid-sort-column>
            <vaadin-grid-column
              .header=${msg("VAT")}
              path="vat_percentage"
            ></vaadin-grid-column>
            <vaadin-grid-sort-column
              .header=${msg("Maximum Available")}
              path="maximum_available"
            ></vaadin-grid-sort-column>
            <vaadin-grid-column
              .header=${msg("Share")}
              .renderer=${(root: any, _: any, model: any) => {
                if (!model.value)
                  model.value = productsRandom.get(model.item.productHash);

                // TODO: actually set the value here
                render(
                  html`<sl-progress-ring
                    .value=${model.value}
                    style="--track-width: 6px; --indicator-width: 6px; --size: 24px"
                  ></sl-progress-ring>`,
                  root
                );
              }}
            ></vaadin-grid-column>
            <vaadin-grid-column
              .header=${msg("Order")}
              .renderer=${(root: any, __: any, model: any) => {
                let value = 0;
                const thisProduct = this.productOrdersQueue.get(
                  model.item.productHash
                );
                if (thisProduct) {
                  value = thisProduct.amount;
                } else if (myHouseholdOrder) {
                  const thisProduct = myHouseholdOrder[1].entry.products.find(
                    (p) =>
                      encodeHashToBase64(p.original_product_hash) ===
                      encodeHashToBase64(model.item.productHash)
                  );
                  if (thisProduct) {
                    value = thisProduct.amount;
                  }
                }
                if (!root.innerHTML.includes("sl-input")) {
                  if (!this.inputs.has(model.item.productHash)) {
                    const div = document.createElement("div");
                    render(
                      html`
                        <sl-input
                          type="number"
                          style="width: 5rem"
                          min="0"
                          .value=${value}
                          @sl-change=${(e: CustomEvent) => {
                            const amount = parseInt(
                              (e.target as SlInput).value
                            );
                            this.productOrdersQueue.set(
                              model.item.productHash,
                              {
                                amount,
                                original_product_hash: model.item.productHash,
                                ordered_product_hash: model.item.actionHash,
                              }
                            );
                            // setTimeout(() => this.requestUpdate());
                            this.setHouseholdProductOrder(
                              myHouseholdHash,
                              myHouseholdOrder
                            );
                          }}
                        ></sl-input>
                      `,
                      div
                    );
                    this.inputs.set(model.item.productHash, div);
                  }
                  const div = this.inputs.get(model.item.productHash);
                  (div.firstChild as SlInput).value = value.toString();
                  root.appendChild(div);
                }
              }}
            ></vaadin-grid-column>
          </vaadin-grid>
        `;
    }
  }

  inputs = new HoloHashMap<ActionHash, HTMLDivElement>();

  renderMyHouseholdOrder(
    householdHash: ActionHash,
    myHouseholdOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined,
    availableProducers: ReadonlyMap<
      ActionHash,
      {
        producer: EntryRecord<Producer>;
        availableProducts: EntryRecord<AvailableProducts>;
      }
    >
  ) {
    return html` <sl-card style="flex: 1;">
      <sl-tab-group placement="bottom" style="flex: 1">
        ${Array.from(availableProducers.entries()).map(
          ([producerHash, producer]) => html`
            <sl-tab slot="nav" .panel=${encodeHashToBase64(producerHash)}
              >${producer.producer.entry.name}</sl-tab
            >
            <sl-tab-panel .name=${encodeHashToBase64(producerHash)}
              >${this.renderProducerProducts(
                householdHash,
                myHouseholdOrder,
                producerHash,
                producer.producer,
                producer.availableProducts
              )}</sl-tab-panel
            >
          `
        )}
      </sl-tab-group>
    </sl-card>`;
    return html` <sl-card style="flex: 1;">
      <form id="create-form" class="column" style="flex: 1; gap: 16px;">
        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg("Create Household Order")}</sl-button
        >
      </form>
    </sl-card>`;
  }

  myHouseholdOrder() {
    const myHousehold = this.householdsStore.myHousehold.get();
    const availableProducts = this.ordersStore.orders
      .get(this.orderHash)
      .availableProducts.live.get();
    if (availableProducts.status !== "completed") return availableProducts;
    if (myHousehold.status !== "completed") return myHousehold;

    const availableProductsLatestVersion = joinAsyncMap(
      mapValues(availableProducts.value, (p) => p.latestVersion.get())
    );

    const myOrders = this.ordersStore.ordersForHousehold
      .get(myHousehold.value!.householdHash)
      .get();
    if (myOrders.status !== "completed") return myOrders;

    let myHouseholdOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined;

    // TODO: what about conflict here???
    if (myOrders.value.size > 0) {
      const order = Array.from(myOrders.value.entries())[0];

      const latestMyHouseholdOrder = order[1].latestVersion.get();
      if (latestMyHouseholdOrder.status !== "completed")
        return latestMyHouseholdOrder;
      myHouseholdOrder = [order[0], latestMyHouseholdOrder.value];
    }
    if (availableProductsLatestVersion.status !== "completed")
      return availableProductsLatestVersion;

    const availableProducersHashes = uniquify(
      Array.from(availableProductsLatestVersion.value.values()).map(
        (ap) => ap.entry.original_producer_hash
      )
    );
    const producers = joinAsync(
      availableProducersHashes.map((producerHash) =>
        this.producersStore.producers.get(producerHash).latestVersion.get()
      )
    );

    if (producers.status !== "completed") return producers;

    const availableProducers: HoloHashMap<
      ActionHash,
      {
        producer: EntryRecord<Producer>;
        availableProducts: EntryRecord<AvailableProducts>;
      }
    > = new HoloHashMap();

    for (let i = 0; i < producers.value.length; i++) {
      const producerHash = availableProducersHashes[i];
      const availableProducts = Array.from(
        availableProductsLatestVersion.value.values()
      ).find(
        (ap) =>
          encodeHashToBase64(ap.entry.original_producer_hash) ===
          encodeHashToBase64(producerHash)
      );

      availableProducers.set(producerHash, {
        availableProducts: availableProducts!,
        producer: producers.value[i],
      });
    }

    return {
      status: "completed" as const,
      value: {
        myHousehold,
        myHouseholdOrder,
        availableProducers,
      },
    };
  }

  render() {
    const myHouseholdOrder = this.myHouseholdOrder();

    switch (myHouseholdOrder.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the order")}
          .error=${myHouseholdOrder.error}
        ></display-error>`;
      case "completed":
        return this.renderMyHouseholdOrder(
          myHouseholdOrder.value.myHousehold.value!.householdHash,
          myHouseholdOrder.value.myHouseholdOrder,
          myHouseholdOrder.value.availableProducers
        );
    }
  }

  static styles = [
    ...appStyles,
    css`
      sl-card::part(body) {
        padding: 0;
      }
      :host {
        display: flex;
      }

      sl-tab-panel::part(base) {
        padding: 0;
      }
    `,
  ];
}
