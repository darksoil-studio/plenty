import {
  SignalWatcher,
  joinAsyncMap,
  uniquify,
} from "@holochain-open-dev/signals";
import { LitElement, css, html, render } from "lit";
import { customElement, property, state } from "lit/decorators.js";
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
import { HouseholdOrder, Order, OrderStatus, ProductOrder } from "../types.js";
import { Household } from "../../households/types.js";
import { HouseholdsStore } from "../../households/households-store.js";
import { householdsStoreContext } from "../../households/context.js";
import { producersStoreContext } from "../../producers/context.js";
import { ProducersStore } from "../../producers/producers-store.js";
import { Producer, Product, renderPackaging } from "../../producers/types.js";
import { GridDataProviderCallback } from "@vaadin/grid/vaadin-grid.js";
import { SlDialog } from "@shoelace-style/shoelace";
import { notifyError } from "@holochain-open-dev/elements";

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

  @state()
  closingOrder = false;

  renderSummary(
    order: EntryRecord<Order>,
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

          const price = product.entry.price_cents / 100;

          const price_with_vat =
            price + (price * product.entry.vat_percentage) / 100;
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
      .reduce((acc, next) => acc + next, 0);
    return html`
      <div class="column" style="flex: 1; height: 100%">
        <div class="row" style="margin: 16px; align-items: center">
          <span class="title">${order.entry.name}</span>
          <span style="flex: 1"></span>
          <sl-button
            variant="primary"
            @click=${() => {
              (
                this.shadowRoot?.getElementById(
                  "close-order-dialog",
                ) as SlDialog
              ).show();
            }}
            >${msg("Close Order")}</sl-button
          >
          <sl-dialog id="close-order-dialog" .label=${msg("Close Order")}>
            <span
              >${msg(
                "Are you sure you want to close the order? If you do, the households won't be able to create or edit their order.",
              )}</span
            >
            <sl-button
              slot="footer"
              @click=${() => {
                (
                  this.shadowRoot?.getElementById(
                    "close-order-dialog",
                  ) as SlDialog
                ).hide();
              }}
              >${msg("Close Order")}</sl-button
            >
            <sl-button
              .loading=${this.closingOrder}
              variant="primary"
              slot="footer"
              @click=${async () => {
                if (this.closingOrder) return;
                this.closingOrder = true;
                try {
                  let status: OrderStatus = {
                    type: "Closed",
                    household_orders: Array.from(householdOrders.keys()),
                  };

                  if (status.household_orders.length === 0) {
                    status = {
                      type: "Finished",
                      household_payments: [],
                      producers_invoices: [],
                    };
                  }

                  await this.ordersStore.client.updateOrder(
                    this.orderHash,
                    order.actionHash,
                    {
                      name: order.entry.name,
                      status,
                    },
                  );
                } catch (e) {
                  console.error(e);
                  notifyError(msg("Error closing the order."));
                }

                this.closingOrder = false;
              }}
              >${msg("Close Order")}</sl-button
            >
          </sl-dialog>
        </div>
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
                  >${msg("Total")}: ${totalAmount.toFixed(2)}</span
                >`,
                root,
              )}
          ></vaadin-grid-column>
        </vaadin-grid>
      </div>
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
          product.entry.price_cents +
          (product.entry.vat_percentage * product.entry.price_cents) / 100;
        return totalPrice * p.amount;
      })
      .reduce((acc, next) => acc + next, 0);

    return {
      status: "completed" as const,
      value: totalAmount,
    };
  }

  allHouseholdsOrders() {
    const householdOrders = this.ordersStore.orders
      .get(this.orderHash)
      .householdOrders.live.get();
    const order = this.ordersStore.orders
      .get(this.orderHash)
      .latestVersion.get();
    if (householdOrders.status !== "completed") return householdOrders;

    const householdOrdersLatestVersion = joinAsyncMap(
      mapValues(householdOrders.value.all, (ho) => ho.latestVersion.get()),
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
    if (order.status !== "completed") return order;

    return {
      status: "completed" as const,
      value: {
        order: order.value,
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
          householdOrders.value.order,
          householdOrders.value.households,
          householdOrders.value.householdsOrders,
          householdOrders.value.products,
          householdOrders.value.producers,
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
