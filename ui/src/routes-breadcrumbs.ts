import { AsyncSignal, SignalWatcher } from "@holochain-open-dev/signals";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js";
import "@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js";

import { appStyles } from "./app-styles.js";
import { RouteConfigWithSignalName, Routes } from "./router.js";
import {
  PathRouteConfig,
  URLPatternRouteConfig,
} from "@holochain-open-dev/elements";

@customElement("routes-breadcrumbs")
export class RoutesBreadcrumbs extends SignalWatcher(LitElement) {
  @property()
  routes!: Routes;

  name(routeConfig: RouteConfigWithSignalName) {
    if (routeConfig.nameSignal)
      return (routeConfig.nameSignal(this.routes.params).get() as any).value;
    if (routeConfig.name) return routeConfig.name;
  }

  matchingRoutes(): Array<[RouteConfigWithSignalName, string]> {
    const currentRoute = this.routes.currentRoute.get();
    const currentPathname = this.routes.currentPathname();
    if (!currentRoute) return [];

    const split = currentPathname.split("/").filter((s) => !!s);
    console.log(currentPathname, split);

    const possibleRoutes = this.routes.routes.filter(
      (route) => route.name || (route as RouteConfigWithSignalName).nameSignal,
    );

    const matchingRoutes: Array<[RouteConfigWithSignalName, string]> = [];

    for (let i = 0; i < split.length + 1; i++) {
      const pathname = split.slice(0, i).join("/");
      console.log(pathname, i);
      const matchingRoute = possibleRoutes.find((route) => {
        const pattern =
          (route as PathRouteConfig).path !== undefined
            ? new URLPattern({ pathname: (route as PathRouteConfig).path })
            : (route as URLPatternRouteConfig).pattern;
        return pattern.test({ pathname });
      });
      if (matchingRoute) {
        matchingRoutes.push([matchingRoute, pathname]);
      }
    }

    return matchingRoutes;
  }

  render() {
    const routes = this.matchingRoutes();
    console.log(routes);
    return html`<sl-breadcrumb>
      ${routes.map(
        ([route, matchingPathname]) => html`
          <sl-breadcrumb-item href="${this.routes.link(matchingPathname)}"
            >${this.name(route)}</sl-breadcrumb-item
          >
        `,
      )}
    </sl-breadcrumb>`;
  }

  static styles = appStyles;
}
