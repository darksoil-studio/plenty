import { RoleConfig } from "@darksoil-studio/roles/dist/role-config.js";
import { msg } from "@lit/localize";

export const bookkeeperRoleConfig: RoleConfig = {
  role: "bookkeeper",
  singular_name: msg("Bookkeeper"),
  plural_name: msg("Bookkeepers"),
  description: msg("The bookkeeper keeps track of payments and invoices."),
};

export const orderManagerRoleConfig: RoleConfig = {
  role: "order_manager",
  singular_name: msg("Order Manager"),
  plural_name: msg("Order Managers"),
  description: msg(
    "The order manager can create and manage new orders for the whole group.",
  ),
};
