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
import {
  mdiAlertCircleOutline,
  mdiDelete,
  mdiInformationOutline,
} from "@mdi/js";
import { SlInput, SlTabGroup } from "@shoelace-style/shoelace";
import { RolesStore, rolesStoreContext } from "@darksoil-studio/roles";
import { GridDataProviderCallback } from "@vaadin/grid/vaadin-grid.js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import "@vaadin/grid/vaadin-grid.js";
import "@vaadin/grid/vaadin-grid-selection-column.js";
import "@vaadin/grid/vaadin-grid-column.js";
import "@vaadin/grid/vaadin-grid-tree-column.js";
import "@vaadin/grid/vaadin-grid-sort-column.js";

import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";

import "./households-orders-summary.js";

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
import { sleep } from "../../../utils.js";
import { orderManagerRoleConfig } from "../../../roles.js";

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
  @consume({ context: rolesStoreContext, subscribe: true })
  rolesStore!: RolesStore;

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
    previousOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined,
  ) {
    if (this.committing) return;
    this.committing = true;
    await sleep(500);

    if (this.orderHash === undefined)
      throw new Error(
        "Cannot create a new Household Order without its order_hash field",
      );

    try {
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
          }),
        );
      } else {
        const queuedProducts = Array.from(this.productOrdersQueue.values()).map(
          (p) => encodeHashToBase64(p.original_product_hash),
        );
        let products = previousOrder[1].entry.products.filter(
          (p) =>
            !queuedProducts.includes(
              encodeHashToBase64(p.original_product_hash),
            ),
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
            householdOrder,
          );

        this.dispatchEvent(
          new CustomEvent("household-order-created", {
            composed: true,
            bubbles: true,
            detail: {
              householdOrderHash: record.actionHash,
            },
          }),
        );
      }
    } catch (e: unknown) {
      console.warn(e);
      // notifyError(msg("Error updating the household order"));
      setTimeout(
        () => this.setHouseholdProductOrder(householdHash, previousOrder),
        100,
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
      availableProducts.entry.producer_availability.available_products,
    );

    return joinAsyncMap(
      mapValues(map, (product) => product.latestVersion.get()),
    );
  }

  renderProducerProducts(
    myHouseholdHash: ActionHash,
    myHouseholdOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined,
    producerHash: ActionHash,
    producer: EntryRecord<Producer>,
    availableProducts: EntryRecord<AvailableProducts>,
    products: ReadonlyMap<ActionHash, EntryRecord<Product>>,
  ) {
    return html`
      <vaadin-grid
        multi-sort
        .items=${Array.from(products.entries()).map(([productHash, p]) => {
          const price_with_vat =
            p.entry.price + (p.entry.price * p.entry.vat_percentage) / 100;
          const amount = this.productOrdersQueue.has(productHash)
            ? this.productOrdersQueue.get(productHash).amount
            : myHouseholdOrder
              ? myHouseholdOrder[1].entry.products.find(
                  (p) =>
                    encodeHashToBase64(p.original_product_hash) ===
                    encodeHashToBase64(productHash),
                )?.amount || 0
              : 0;
          return {
            ...p.entry,
            productHash,
            actionHash: p.actionHash,
            price_with_vat,
            total_price: Math.round(amount * price_with_vat * 100) / 100,
          };
        })}
        style="flex: 1; height: 100%"
      >
        <vaadin-grid-column
          .header=${msg("Product")}
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
          path="price_with_vat"
        ></vaadin-grid-sort-column>
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
              root,
            );
          }}
        ></vaadin-grid-column>
        <vaadin-grid-column
          .header=${msg("Order")}
          .renderer=${(root: any, __: any, model: any) => {
            let value = 0;
            const thisProduct = this.productOrdersQueue.get(
              model.item.productHash,
            );
            if (thisProduct) {
              value = thisProduct.amount;
            } else if (myHouseholdOrder) {
              const thisProduct = myHouseholdOrder[1].entry.products.find(
                (p) =>
                  encodeHashToBase64(p.original_product_hash) ===
                  encodeHashToBase64(model.item.productHash),
              );
              if (thisProduct) {
                value = thisProduct.amount;
              }
            }
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
                      const amount = parseInt((e.target as SlInput).value);
                      this.productOrdersQueue.set(model.item.productHash, {
                        amount,
                        original_product_hash: model.item.productHash,
                        ordered_product_hash: model.item.actionHash,
                      });
                      this.requestUpdate();
                      this.setHouseholdProductOrder(
                        myHouseholdHash,
                        myHouseholdOrder,
                      );
                    }}
                  ></sl-input>
                `,
                div,
              );
              this.inputs.set(model.item.productHash, div);
            }
            const div = this.inputs.get(model.item.productHash);
            (div.querySelector("sl-input") as SlInput).value = value.toString();
            root.appendChild(div);
          }}
        ></vaadin-grid-column>
        <vaadin-grid-column
          .header=${msg("Total")}
          path="total_price"
        ></vaadin-grid-column>
      </vaadin-grid>
    `;
  }

  renderOrderSummary() {
    return html`<households-orders-summary style="flex: 1" .orderHash=${this.orderHash}></household-orders-summary>`;
  }

  inputs = new HoloHashMap<ActionHash, HTMLDivElement>();

  renderMyHouseholdOrderSummary(
    availableProducers: ReadonlyMap<
      ActionHash,
      {
        producer: EntryRecord<Producer>;
        products: ReadonlyMap<ActionHash, EntryRecord<Product>>;
        availableProducts: EntryRecord<AvailableProducts>;
      }
    >,
    myHouseholdOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined,
  ) {
    if (!myHouseholdOrder)
      return html`
        <div
          class="column"
          style="flex: 1; align-items: center; justify-content: center"
        >
          <div
            class="column"
            style="align-items: center; justify-content: center; gap: 16px;"
          >
            <sl-icon
              style="color: grey; height: 64px; width: 64px;"
              .src=${wrapPathInSvg(mdiInformationOutline)}
            ></sl-icon>
            <span class="placeholder"
              >${msg("You haven't ordered any products yet")}</span
            >
          </div>
        </div>
      `;
    const products = new HoloHashMap<
      ActionHash,
      {
        producerHash: ActionHash;
        producer: EntryRecord<Producer>;
        product: EntryRecord<Product>;
      }
    >();
    for (const availableProducer of Array.from(availableProducers.entries())) {
      const producerAvailability =
        availableProducer[1].availableProducts.entry.producer_availability;
      if (producerAvailability.type !== "Available") continue;
      for (const productHash of producerAvailability.available_products) {
        products.set(productHash, {
          producerHash: availableProducer[0],
          producer: availableProducer[1].producer,
          product: availableProducer[1].products.get(productHash)!,
        });
      }
    }

    const producers = uniquify(
      myHouseholdOrder[1].entry.products.map(
        (productOrder) =>
          products.get(productOrder.original_product_hash).producerHash,
      ),
    );

    const producersItems = producers.map((producerHash) => ({
      name: availableProducers.get(producerHash)!.producer.entry.name,
      children: Array.from(
        myHouseholdOrder[1].entry.products.filter(
          (productOrder) =>
            encodeHashToBase64(
              products.get(productOrder.original_product_hash).producerHash,
            ) === encodeHashToBase64(producerHash),
        ),
      ).map((productOrder) => {
        const productInfo = products.get(productOrder.original_product_hash)!;
        const price_with_vat =
          productInfo.product.entry.price +
          (productInfo.product.entry.price *
            productInfo.product.entry.vat_percentage) /
            100;
        const price_with_vat_rounded = (
          Math.round(price_with_vat * 100) / 100
        ).toFixed(2);
        const amount = productOrder.amount;
        return {
          name: productInfo.product.entry.name,
          packaging: productInfo.product.entry.packaging,
          amount: productOrder.amount,
          price_with_vat: price_with_vat_rounded,
          total_price: (
            Math.round(amount * price_with_vat * 100) / 100
          ).toFixed(2),
        };
      }),
      packaging: "",
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

  renderMyHouseholdOrder(
    householdHash: ActionHash,
    myHouseholdOrder: [ActionHash, EntryRecord<HouseholdOrder>] | undefined,
    availableProducers: ReadonlyMap<
      ActionHash,
      {
        producer: EntryRecord<Producer>;
        products: ReadonlyMap<ActionHash, EntryRecord<Product>>;
        availableProducts: EntryRecord<AvailableProducts>;
      }
    >,
    iAmOrderManager: boolean,
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
                producer.availableProducts,
                producer.products,
              )}</sl-tab-panel
            >
          `,
        )}
        <sl-tab-panel name="my_household_order_summary">
          ${this.renderMyHouseholdOrderSummary(
            availableProducers,
            myHouseholdOrder,
          )}
        </sl-tab-panel>
        <sl-tab-panel name="order_summary">
          ${this.renderOrderSummary()}
        </sl-tab-panel>
        <sl-tab style="flex: 1" slot="nav"></sl-tab>
        <sl-tab slot="nav" variant="primary" panel="my_household_order_summary"
          >${iAmOrderManager
            ? msg("My Household Order Summary")
            : msg("Summary")}</sl-tab
        >
        ${iAmOrderManager
          ? html`
              <sl-tab slot="nav" panel="order_summary"
                >${msg("Order Summary")}</sl-tab
              >
            `
          : html``}
      </sl-tab-group>
    </sl-card>`;
  }

  myHouseholdOrder() {
    const myHousehold = this.householdsStore.myHousehold.get();
    const availableProducts = this.ordersStore.orders
      .get(this.orderHash)
      .availableProducts.live.get();
    const myRoles = this.rolesStore.myRoles.get();
    if (availableProducts.status !== "completed") return availableProducts;
    if (myHousehold.status !== "completed") return myHousehold;

    const availableProductsLatestVersion = joinAsyncMap(
      mapValues(availableProducts.value, (p) => p.latestVersion.get()),
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

      for (const [productHash, queuedProduct] of Array.from(
        this.productOrdersQueue.entries(),
      )) {
        for (const product of latestMyHouseholdOrder.value.entry.products) {
          if (
            encodeHashToBase64(product.original_product_hash) ===
              encodeHashToBase64(productHash) &&
            product.amount === queuedProduct.amount
          ) {
            this.productOrdersQueue.delete(productHash);
          }
        }
      }
    }
    if (availableProductsLatestVersion.status !== "completed")
      return availableProductsLatestVersion;

    const availableProducersHashes = uniquify(
      Array.from(availableProductsLatestVersion.value.values()).map(
        (ap) => ap.entry.original_producer_hash,
      ),
    );
    const producers = joinAsync(
      availableProducersHashes.map((producerHash) =>
        this.producersStore.producers.get(producerHash).latestVersion.get(),
      ),
    );

    if (producers.status !== "completed") return producers;

    const availableProducers: HoloHashMap<
      ActionHash,
      {
        producer: EntryRecord<Producer>;
        products: ReadonlyMap<ActionHash, EntryRecord<Product>>;
        availableProducts: EntryRecord<AvailableProducts>;
      }
    > = new HoloHashMap();

    for (let i = 0; i < producers.value.length; i++) {
      const producerHash = availableProducersHashes[i];
      const availableProducts = Array.from(
        availableProductsLatestVersion.value.values(),
      ).find(
        (ap) =>
          encodeHashToBase64(ap.entry.original_producer_hash) ===
          encodeHashToBase64(producerHash),
      );

      const products = this.getProductsLatestVersion(availableProducts!);
      if (products.status !== "completed") return products;

      availableProducers.set(producerHash, {
        availableProducts: availableProducts!,
        producer: producers.value[i],
        products: products.value,
      });
    }
    if (myRoles.status !== "completed") return myRoles;
    const iAmOrderManager = myRoles.value.includes(orderManagerRoleConfig.role);

    return {
      status: "completed" as const,
      value: {
        myHousehold,
        myHouseholdOrder,
        availableProducers,
        iAmOrderManager,
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
          myHouseholdOrder.value.availableProducers,
          myHouseholdOrder.value.iAmOrderManager,
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
