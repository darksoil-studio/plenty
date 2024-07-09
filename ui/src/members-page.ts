import { SignalWatcher, pipe } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import "@holochain-open-dev/profiles/dist/elements/profile-list-item.js";
import "@darksoil-studio/roles/dist/elements/all-roles.js";
import { msg } from "@lit/localize";

import "./routes-breadcrumbs.js";
import { Routes } from "./router.js";
import { appStyles } from "./app-styles.js";
import { consume } from "@lit/context";
import { RolesStore, rolesStoreContext } from "@darksoil-studio/roles";
import { adminRoleConfig } from "@darksoil-studio/roles/dist/role-config.js";
import { bookkeeperRoleConfig, orderManagerRoleConfig } from "./roles.js";

@customElement("members-page")
export class MembersPage extends SignalWatcher(LitElement) {
  @consume({ context: rolesStoreContext })
  rolesStore!: RolesStore;

  routes: Routes = new Routes(this, [
    {
      path: "",
      name: msg("All Households"),
      render: () => html`
        <div class="column" style="margin: 16px 0">
          <div class="row" style="align-items: center">
            <span class="title">${msg("Members")}</span>
            <routes-breadcrumbs
              style="margin-left: 24px"
              .routes=${this.routes}
            ></routes-breadcrumbs>
            <span style="flex: 1"></span>
            ${this.renderManageRoles()}
          </div>
          <sl-divider></sl-divider>
          <all-members></all-members>
        </div>
      `,
    },
    {
      path: "manage-roles",
      name: msg("Manage Roles"),
      render: () => html`
        <div class="column" style="margin: 12px 0">
          <div class="row" style="align-items: center">
            <span class="title">${msg("Members")}</span>
            <routes-breadcrumbs
              style="margin-left: 24px"
              .routes=${this.routes}
            ></routes-breadcrumbs>
          </div>
          <sl-divider></sl-divider>
          <div class="column" style="flex: 1; align-items: center;">
            <div class="column" style="width: 500px; gap: 32px">
              <sl-card style="width: 500px">
                <role-detail
                  style="flex: 1"
                  .role=${orderManagerRoleConfig.role}
                ></role-detail>
              </sl-card>
              <sl-card>
                <role-detail
                  style="flex: 1"
                  .role=${bookkeeperRoleConfig.role}
                ></role-detail>
              </sl-card>
            </div>
          </div>
        </div>
      `,
    },
  ]);

  renderManageRoles() {
    const myRoles = this.rolesStore.myRoles.get();
    if (myRoles.status !== "completed") return html``;
    const iAmAdmin = myRoles.value.includes(adminRoleConfig.role);

    if (!iAmAdmin) return html``;

    return html`
      <sl-button @click=${() => this.routes.goto("manage-roles")}
        >${msg("Manage Roles")}</sl-button
      >
    `;
  }

  render() {
    return this.routes.outlet();
  }

  static styles = [...appStyles];
}
