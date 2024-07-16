import {
  SignalWatcher,
  joinAsyncMap,
  uniquify,
} from "@holochain-open-dev/signals";
import { LitElement, html, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ActionHash, encodeHashToBase64 } from "@holochain/client";
import { consume } from "@lit/context";
import { msg } from "@lit/localize";
import {
  EntryRecord,
  HoloHashMap,
  mapValues,
  slice,
} from "@holochain-open-dev/utils";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";

import { appStyles } from "../../../app-styles.js";
import { ordersStoreContext } from "../context.js";
import { OrdersStore } from "../orders-store.js";
import { HouseholdOrder, ProductOrder } from "../types.js";
import { Household } from "../../households/types.js";
import { HouseholdsStore } from "../../households/households-store.js";
import { householdsStoreContext } from "../../households/context.js";
import { producersStoreContext } from "../../producers/context.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { Producer, Product, renderPackaging } from "../../producers/types.js";
import { GridDataProviderCallback } from "@vaadin/grid/vaadin-grid.js";

@customElement("households-orders-summary")
export class HouseholdsOrdersSummary extends SignalWatcher(LitElement) {
  @property()
  orderHash!: ActionHash;

  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  @consume({ context: producersStoreContext, subscribe: true })
  producersStore!: ProducersStore;

  @consume({ context: householdsStoreContext, subscribe: true })
  householdsStore!: HouseholdsStore;

  renderSummary(
    households: ReadonlyMap<ActionHash, EntryRecord<Household>>,
    householdOrders: ReadonlyMap<ActionHash, EntryRecord<HouseholdOrder>>,
    products: ReadonlyMap<ActionHash, EntryRecord<Product>>,
    producers: ReadonlyMap<ActionHash, EntryRecord<Producer>>,
  ) {
    const producersItems = Array.from(producers.keys()).map((producerHash) => ({
      name: producers.get(producerHash)!.entry.name,
      children: Array.from(products.entries())
        .filter(
          ([_, product]) =>
            encodeHashToBase64(product.entry.producer_hash) ===
            encodeHashToBase64(producerHash),
        )
        .map(([productHash, product]) => {
          const householdProductOrdersForThisProduct = new HoloHashMap<
            ActionHash,
            ProductOrder
          >();

          for (const [householdHash, householdOrder] of Array.from(
            householdOrders.entries(),
          )) {
            for (const product of householdOrder.entry.products) {
              if (
                encodeHashToBase64(product.original_product_hash) ===
                encodeHashToBase64(productHash)
              ) {
                householdProductOrdersForThisProduct.set(
                  householdHash,
                  product,
                );
              }
            }
          }

          const price_with_vat =
            product.entry.price +
            (product.entry.price * product.entry.vat_percentage) / 100;
          const price_with_vat_rounded = (
            Math.round(price_with_vat * 100) / 100
          ).toFixed(2);

          const children = Array.from(
            householdProductOrdersForThisProduct.entries(),
          ).map(([householdHash, productOrder]) => ({
            name: households.get(householdHash)!.entry.name,
            amount: productOrder.amount,
            // total_price: (
            //   Math.round(productOrder.amount * price_with_vat * 100) / 100
            // ).toFixed(2),
          }));

          const amount = Array.from(
            householdProductOrdersForThisProduct.values(),
          ).reduce((acc, next) => acc + next.amount, 0);
          return {
            name: product.entry.name,
            packaging: product.entry.packaging,
            amount,
            children,
            price_with_vat: price_with_vat_rounded,
            total_price: (
              Math.round(amount * price_with_vat * 100) / 100
            ).toFixed(2),
          };
        }),
      amount: "",
      price_with_vat: "",
      total_price: "",
    }));

    const expandedItems = producersItems;

    const dataProvider: GridDataProviderCallback<any> = (
      params: any,
      callback: any,
    ) => {
      const items = params.parentItem?.children || producersItems;
      callback(items, items.length);
    };
    const totalAmount = ([] as number[])
      .concat(
        ...producersItems.map((pi) =>
          pi.children.map((product) => parseFloat(product.total_price)),
        ),
      )
      .reduce((acc, next) => acc + next);
    return html`
      <vaadin-grid
        multi-sort
        .dataProvider=${dataProvider}
        .expandedItems=${expandedItems}
        style="flex: 1; height: 100%"
      >
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
          .header=${msg("Amount")}
          path="amount"
        ></vaadin-grid-column>
        <vaadin-grid-column
          .header=${msg("Total")}
          path="total_price"
          .footerRenderer=${(root: any) =>
            render(
              html`<span style="font-weight: bold"
                >${msg("Total")}: ${totalAmount}</span
              >`,
              root,
            )}
        ></vaadin-grid-column>
      </vaadin-grid>
    `;
  }

  getTotalAmount(householdOrder: EntryRecord<HouseholdOrder>) {
    const productsHashes = householdOrder.entry.products.map(
      (p) => p.original_product_hash,
    );
    const products = slice(this.producersStore.products, productsHashes);

    const productsLatestVersion = joinAsyncMap(
      mapValues(products, (p) => p.latestVersion.get()),
    );
    if (productsLatestVersion.status !== "completed")
      return productsLatestVersion;

    const totalAmount = householdOrder.entry.products
      .map((p) => {
        const product = productsLatestVersion.value.get(
          p.original_product_hash,
        )!;

        const totalPrice =
          product.entry.price +
          (product.entry.vat_percentage * product.entry.price) / 100;
        return totalPrice * p.amount;
      })
      .reduce((acc, next) => acc + next);

    return {
      status: "completed" as const,
      value: totalAmount,
    };
  }

  allHouseholdsOrders() {
    const householdOrders = this.ordersStore.orders
      .get(this.orderHash)
      .householdOrders.live.get();
    if (householdOrders.status !== "completed") return householdOrders;

    const householdOrdersLatestVersion = joinAsyncMap(
      mapValues(householdOrders.value, (ho) => ho.latestVersion.get()),
    );
    if (householdOrdersLatestVersion.status !== "completed")
      return householdOrdersLatestVersion;

    const householdsLatestVersion = joinAsyncMap(
      mapValues(householdOrdersLatestVersion.value, (ho) =>
        this.householdsStore.households
          .get(ho.entry.household_hash)
          .latestVersion.get(),
      ),
    );
    if (householdsLatestVersion.status !== "completed")
      return householdsLatestVersion;

    const allProductsHashes = uniquify(
      ([] as ActionHash[]).concat(
        ...Array.from(householdOrdersLatestVersion.value.values()).map((ho) =>
          ho.entry.products.map((p) => p.original_product_hash),
        ),
      ),
    );

    const allProductsLatestVersion = joinAsyncMap(
      mapValues(
        slice(this.producersStore.products, allProductsHashes),
        (product) => product.latestVersion.get(),
      ),
    );
    if (allProductsLatestVersion.status !== "completed")
      return allProductsLatestVersion;

    const allProducersHashes = uniquify(
      Array.from(allProductsLatestVersion.value.values()).map(
        (p) => p.entry.producer_hash,
      ),
    );
    const allProducersLatestVersion = joinAsyncMap(
      mapValues(
        slice(this.producersStore.producers, allProducersHashes),
        (producer) => producer.latestVersion.get(),
      ),
    );
    if (allProducersLatestVersion.status !== "completed")
      return allProducersLatestVersion;

    return {
      status: "completed" as const,
      value: {
        households: householdsLatestVersion.value,
        householdsOrders: householdOrdersLatestVersion.value,
        products: allProductsLatestVersion.value,
        producers: allProducersLatestVersion.value,
      },
    };
  }

  render() {
    const householdOrders = this.allHouseholdsOrders();
    switch (householdOrders.status) {
      case "pending":
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the orders for all the households")}
          .error=${householdOrders.error}
        ></display-error>`;
      case "completed":
        return this.renderSummary(
          householdOrders.value.households,
          householdOrders.value.householdsOrders,
          householdOrders.value.products,
          householdOrders.value.producers,
        );
    }
  }

  static styles = appStyles;
}