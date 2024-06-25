import {
  BaseRouteConfig,
  Router as NativeRouter,
  Routes as NativeRoutes,
  RouteConfig,
} from "@holochain-open-dev/elements";
import { AsyncSignal, Signal } from "@holochain-open-dev/signals";
import { ReactiveControllerHost } from "lit";

export type RouteConfigWithSignalName = RouteConfig & {
  nameSignal?: (params: {
    [key: string]: string | undefined;
  }) => AsyncSignal<string>;
};

export class Routes extends NativeRoutes {
  constructor(
    host: ReactiveControllerHost & HTMLElement,
    routes: Array<RouteConfigWithSignalName>,
    options?: {
      fallback?: BaseRouteConfig;
    },
  ) {
    super(host, routes, options);
  }

  private currentRouteSignal = new Signal.State<RouteConfig | undefined>(
    undefined,
  );

  get childRoutes(): Array<Routes> {
    return (this as any)._childRoutes as Array<Routes>;
  }
  get parentRoutes(): Routes | undefined {
    return (this as any)._parentRoutes as Routes | undefined;
  }

  get currentRoute(): Signal.State<RouteConfig | undefined> {
    return this.currentRouteSignal;
  }

  async goto(pathname: string) {
    await super.goto(pathname);

    const cr = (this as any)._currentRoute as RouteConfig | undefined;
    this.currentRouteSignal.set(cr);
  }

  pop(parentPath: string = "") {
    const previousPathname = this.currentPathname();
    window.history.back();

    setTimeout(() => {
      if (this.currentPathname() === previousPathname) {
        const split = previousPathname.split("/");
        const prefix = split.slice(0, split.length - 1).join("/");
        this.goto(prefix);
      }
    });
  }
}

export class Router extends NativeRouter {}
