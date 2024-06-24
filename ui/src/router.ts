import {
  Router as NativeRouter,
  Routes as NativeRoutes,
  RouteConfig,
} from "@holochain-open-dev/elements";
import { Signal } from "@holochain-open-dev/signals";

export class Routes extends NativeRoutes {
  currentRouteSignal = new Signal.State<RouteConfig | undefined>(undefined);

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
}

export class Router extends NativeRouter {}
