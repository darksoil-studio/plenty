import { AsyncResult, SignalWatcher, pipe } from "@holochain-open-dev/signals";
import { css, LitElement, html } from "lit";
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
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiPencil, mdiPlus } from "@mdi/js";
import { RolesStore, rolesStoreContext } from "@darksoil-studio/roles";

import "./routes-breadcrumbs.js";
import "./overlay-page.js";
import "./plenty/orders/elements/all-orders.js";
import "./plenty/orders/elements/create-order.js";
import "./plenty/orders/elements/order-detail.js";
import "./plenty/orders/elements/create-available-products.js";
import "./plenty/orders/elements/edit-available-products.js";
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
import { ordersStoreContext } from "./plenty/orders/context.js";
import { OrdersStore } from "./plenty/orders/orders-store.js";
import { orderManagerRoleConfig } from "./roles.js";

@customElement("orders-page")
export class ProducersPage extends SignalWatcher(LitElement) {
  @consume({ context: ordersStoreContext, subscribe: true })
  ordersStore!: OrdersStore;

  @consume({ context: rolesStoreContext, subscribe: true })
  rolesStore!: RolesStore;

  routes = new Routes(this, [
    {
      path: "",
      name: msg("All Orders"),
      render: () => html`
        <div class="column">
          <all-orders
            @order-selected=${(e: CustomEvent) =>
              this.routes.goto(encodeHashToBase64(e.detail.orderHash))}
          ></all-orders>
        </div>
      `,
    },
    {
      path: "create-order",
      render: () => html`
        <overlay-page
          .title=${msg("Create Order")}
          @close-requested=${() => this.routes.pop()}
        >
          <div
            class="column"
            style="flex: 1; align-items: center; width: 50rem"
          >
            <create-order
              style="width: 400px; margin-top: 12px"
              @close-requested=${() => this.routes.pop()}
              @order-created=${(e: CustomEvent) => {
                this.routes.goto(`${encodeHashToBase64(e.detail.orderHash)}`);
              }}
            ></create-order>
          </div>
        </overlay-page>
      `,
    },
    {
      path: ":orderHash",
      nameSignal: (params) =>
        pipe(
          this.ordersStore.orders.get(
            decodeHashFromBase64(params.orderHash as ActionHashB64),
          ).latestVersion,
          (order) => order.entry.name,
        ),
      render: (params) =>
        this.renderOrder(
          decodeHashFromBase64(params.orderHash as ActionHashB64),
        ),
    },
    {
      path: ":orderHash/edit",
      render: (params) => html`
        <overlay-page
          .title=${msg("Edit Order")}
          @close-requested=${() => {
            this.routes.pop();
          }}
        >
          <edit-order
            .orderHash=${decodeHashFromBase64(
              params.orderHash as ActionHashB64,
            )}
            @edit-canceled=${() => this.routes.pop()}
            @order-updated=${(e: CustomEvent) => {
              this.routes.pop();
            }}
          ></edit-order>
        </overlay-page>
      `,
    },
    {
      path: ":orderHash/available-products/:producerHash",
      enter: (params) => {
        this.routes.goto(`${params.orderHash}`);
        return false;
      },
    },
    {
      path: ":orderHash/available-products/:producerHash/create",
      render: (params) => html`
        <overlay-page
          .title=${msg("Set Available Products")}
          @close-requested=${() => {
            this.routes.pop();
          }}
        >
          <create-available-products
            style="width: 70rem; flex: 1"
            .orderHash=${decodeHashFromBase64(
              params.orderHash as ActionHashB64,
            )}
            .producerHash=${decodeHashFromBase64(
              params.producerHash as ActionHashB64,
            )}
            @edit-canceled=${() => this.routes.pop()}
            @available-products-created=${(e: CustomEvent) => {
              this.routes.pop();
            }}
          ></create-available-products>
        </overlay-page>
      `,
    },
    {
      path: ":orderHash/available-products/:availableProductsHash/edit",
      render: (params) => html`
        <overlay-page
          .title=${msg("Edit Available Products")}
          @close-requested=${() => {
            this.routes.pop();
          }}
        >
          <edit-available-products
            style="width: 70rem; flex: 1"
            .availableProductsHash=${decodeHashFromBase64(
              params.availableProductsHash as ActionHashB64,
            )}
            @edit-canceled=${() => this.routes.pop()}
            @available-products-updated=${(e: CustomEvent) => {
              this.routes.pop();
            }}
          ></edit-available-products>
        </overlay-page>
      `,
    },
  ]);

  renderOrder(orderHash: ActionHash) {
    const order = this.ordersStore.orders.get(orderHash).latestVersion.get();

    switch (order.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "error":
        return html`<display-error
          .error=${order.error}
          .headline=${msg("Error fetching the order")}
        ></display-error>`;

      case "completed":
        return html`
          <order-detail
            style="flex: 1"
            .orderHash=${orderHash}
            @set-available-products-requested=${(e: CustomEvent) =>
              this.routes.goto(
                `${encodeHashToBase64(
                  orderHash,
                )}/available-products/${encodeHashToBase64(
                  e.detail.producerHash,
                )}/create`,
              )}
            @edit-available-products-requested=${(e: CustomEvent) =>
              this.routes.goto(
                `${encodeHashToBase64(
                  orderHash,
                )}/available-products/${encodeHashToBase64(
                  e.detail.availableProductsHash,
                )}/edit`,
              )}
          ></order-detail>
        `;
    }
  }

  canICreateOrders(): AsyncResult<boolean> {
    const myRoles = this.rolesStore.myRoles.get();
    if (myRoles.status !== "completed") return myRoles;

    const orderManager = myRoles.value.includes(orderManagerRoleConfig.role);

    return {
      status: "completed",
      value: orderManager,
    };
  }

  render() {
    const showCreateOrderButton = this.canICreateOrders();
    return html`
      <div class="column" style="margin: 12px 0; flex: 1">
        <div class="row" style="align-items: center; height: 38px">
          <span class="title">${msg("Orders")}</span>
          <routes-breadcrumbs
            style="margin-left: 24px"
            .routes=${this.routes}
          ></routes-breadcrumbs>
          <span style="flex: 1"></span>
          ${this.routes.currentRoute.get()?.name === msg("All Orders") &&
          showCreateOrderButton.status === "completed" &&
          showCreateOrderButton.value
            ? html`
                <sl-button @click=${() => this.routes.goto("create-order")}>
                  <sl-icon
                    .src=${wrapPathInSvg(mdiPlus)}
                    slot="prefix"
                  ></sl-icon>
                  ${msg("Create Order")}</sl-button
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
      :host {
        display: flex;
        flex: 1;
      }
    `,
  ];
}
