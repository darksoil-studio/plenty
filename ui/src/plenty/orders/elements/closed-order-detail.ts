import {
  joinAsyncMap,
  SignalWatcher,
  uniquify,
} from "@holochain-open-dev/signals";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  EntryRecord,
  HoloHashMap,
  mapValues,
  pickBy,
  slice,
} from "@holochain-open-dev/utils";
import { msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/tag/tag.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";

import { appStyles } from "../../../app-styles.js";
import {
  HouseholdOrder,
  Order,
  ProducerDelivery,
  ProducerInvoice,
  ProductDelivery,
  ProductOrder,
} from "../types.js";
import { ActionHash, encodeHashToBase64 } from "@holochain/client";
import { Producer, Product, renderPackaging } from "../../producers/types.js";
import { ordersStoreContext } from "../context.js";
import { OrdersStore } from "../orders-store.js";
import { flatten } from "../../../utils.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { producersStoreContext } from "../../producers/context.js";
import { GridDataProviderCallback } from "@vaadin/grid";
import { Household } from "../../households/types.js";
import { HouseholdsStore } from "../../households/households-store.js";
import { householdsStoreContext } from "../../households/context.js";
import { styleMap } from "lit/directives/style-map.js";
import { showOverlayPage } from "../../../overlay-page.js";
import "./create-producer-delivery.js";

@customElement("closed-order-detail")
export class ClosedOrderDetail extends SignalWatcher(LitElement) {
  @property()
  orderHash!: ActionHash;

  @property()
  order!: EntryRecord<Order>;

  @property()
  householdOrdersHashes!: ActionHash[];

  /**
   * @internal
   */
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  /**
   * @internal
   */
  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  /**
   * @internal
   */
  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  @state()
  creatingProducerDelivery = false;

  renderProducerTab(
    producerHash: ActionHash,
    orderedProducts: ReadonlyMap<ActionHash, EntryRecord<Product>>,
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>,
    allHouseholdsOrders: ReadonlyMap<ActionHash, EntryRecord<HouseholdOrder>>,
    producerDeliveries: ReadonlyMap<ActionHash, EntryRecord<ProducerDelivery>>,
  ) {
    const deliveriesForThisProducer = pickBy(
      producerDeliveries,
      (v) =>
        encodeHashToBase64(v.entry.producer_hash) ===
        encodeHashToBase64(producerHash),
    );

    const productsForThisProducer = pickBy(
      orderedProducts,
      (v) =>
        encodeHashToBase64(producerHash) ===
        encodeHashToBase64(v.entry.producer_hash),
    );

    const productsItems = Array.from(productsForThisProducer.entries()).map(
      ([productHash, product]) => {
        const householdProductOrdersForThisProduct = new HoloHashMap<
          ActionHash,
          ProductOrder
        >();

        for (const householdOrder of Array.from(allHouseholdsOrders.values())) {
          for (const product of householdOrder.entry.products) {
            if (
              encodeHashToBase64(product.original_product_hash) ===
              encodeHashToBase64(productHash)
            ) {
              householdProductOrdersForThisProduct.set(
                householdOrder.entry.household_hash,
                product,
              );
            }
          }
        }

        const price = product.entry.price_cents / 100;

        const price_with_vat =
          price + (price * product.entry.vat_percentage) / 100;
        const price_with_vat_rounded = (
          Math.round(price_with_vat * 100) / 100
        ).toFixed(2);

        const children = Array.from(
          householdProductOrdersForThisProduct.entries(),
        ).map(([householdHash, productOrder]) => ({
          householdHash,
          productHash,
          name: households.get(householdHash)!.entry.name,
          amount_ordered: productOrder.amount,
          // total_price: (
          //   Math.round(productOrder.amount * price_with_vat * 100) / 100
          // ).toFixed(2),
        }));

        const amount_ordered = Array.from(
          householdProductOrdersForThisProduct.values(),
        ).reduce((acc, next) => acc + next.amount, 0);
        return {
          productHash,
          name: product.entry.name,
          packaging: product.entry.packaging,
          amount_ordered,
          children,
          price_with_vat: price_with_vat_rounded,
        };
      },
    );

    const dataProvider: GridDataProviderCallback<any> = (
      params: any,
      callback: any,
    ) => {
      const items = params.parentItem?.children || productsItems;
      callback(items, items.length);
    };

    return html` <div class="column" style="flex: 1">
      <div class="row" style="margin: 16px; align-items: center; gap: 12px">
        <span>${msg("Ordered Products")}</span>
        <span style="flex: 1"></span>
        ${deliveriesForThisProducer.size === 0
          ? html`<sl-tag>${msg("Not Processed")}</sl-tag
              ><sl-button
                variant="primary"
                @click=${() =>
                  showOverlayPage(
                    msg("Process Delivery"),
                    (closePage) =>
                      html`<create-producer-delivery
                        style="flex: 1"
                        .items=${productsItems}
                        @producer-delivery-created=${() => closePage()}
                      ></create-producer-delivery>`,
                  )}
                >${msg("Process Delivery")}</sl-button
              > `
          : html`<sl-tag variant="success">${msg("Processed")}</sl-tag>`}
      </div>
      <vaadin-grid style="flex: 1; height: 100%" .dataProvider=${dataProvider}>
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
      </vaadin-grid>
    </div>`;
  }

  renderProducersTabs(
    producers: ReadonlyMap<ActionHash, EntryRecord<Producer>>,
    orderedProducts: ReadonlyMap<ActionHash, EntryRecord<Product>>,
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>,
    allHouseholdsOrders: ReadonlyMap<ActionHash, EntryRecord<HouseholdOrder>>,
    producerDeliveries: ReadonlyMap<ActionHash, EntryRecord<ProducerDelivery>>,
  ) {
    const processedProducers = uniquify(
      Array.from(producerDeliveries.values()).map((p) => p.entry.producer_hash),
    ).map(encodeHashToBase64);
    return html` <sl-card style="flex: 1;">
      <sl-tab-group placement="bottom" style="flex: 1">
        ${Array.from(producers.entries()).map(
          ([producerHash, producer]) => html`
            <sl-tab-panel name="${encodeHashToBase64(producerHash)}"
              >${this.renderProducerTab(
                producerHash,
                orderedProducts,
                households,
                allHouseholdsOrders,
                producerDeliveries,
              )}</sl-tab-panel
            >
            <sl-tab
              panel="${encodeHashToBase64(producerHash)}"
              slot="nav"
              style=${styleMap({
                "background-color": processedProducers.includes(
                  encodeHashToBase64(producerHash),
                )
                  ? "lightgreen"
                  : "auto",
              })}
              >${producer.entry.name}</sl-tab
            >
          `,
        )}
      </sl-tab-group></sl-card
    >`;
  }

  producersAndOrders() {
    const householdOrders = joinAsyncMap(
      mapValues(
        slice(this.ordersStore.householdOrders, this.householdOrdersHashes),
        (h) => h.latestVersion.get(),
      ),
    );

    const producerDeliveries = this.ordersStore.orders
      .get(this.orderHash)
      .producerDeliveries.live.get();
    if (householdOrders.status !== "completed") return householdOrders;
    if (producerDeliveries.status !== "completed") return producerDeliveries;

    const producerDeliveriesLatest = joinAsyncMap(
      mapValues(producerDeliveries.value, (h) => h.latestVersion.get()),
    );

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

    const allProducersHashes = uniquify(
      Array.from(products.value.values()).map((p) => p.entry.producer_hash),
    );

    const producers = joinAsyncMap(
      mapValues(slice(this.producersStore.producers, allProducersHashes), (p) =>
        p.latestVersion.get(),
      ),
    );
    if (producers.status !== "completed") return producers;
    if (producerDeliveriesLatest.status !== "completed")
      return producerDeliveriesLatest;

    return {
      status: "completed" as const,
      value: {
        producers: producers.value,
        products: products.value,
        householdOrders: householdOrders.value,
        households: households.value,
        producerDeliveries: producerDeliveriesLatest.value,
      },
    };
  }

  render() {
    const details = this.producersAndOrders();

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
        return this.renderProducersTabs(
          details.value.producers,
          details.value.products,
          details.value.households,
          details.value.householdOrders,
          details.value.producerDeliveries,
        );
    }
  }
  static styles = [
    ...appStyles,
    css`
      :host {
        display: flex;
      }
      sl-card::part(body) {
        padding: 0;
      }
      sl-tab-panel::part(base) {
        padding: 0;
      }
    `,
  ];
}
