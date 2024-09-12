{
  description = "Template for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.3";
    # nixpkgs.follows = "holonix/nixpkgs";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
    flake-parts.follows = "holonix/flake-parts";
    crane.follows = "holonix/crane";

    p2p-shipyard.url = "github:darksoil-studio/p2p-shipyard/develop";
    hc-infra.url = "github:holochain-open-dev/infrastructure";
    scaffolding.url = "github:holochain-open-dev/templates";

    tasks.url = "github:darksoil-studio/tasks";
    notifications.url = "github:darksoil-studio/notifications";
    file-storage.url = "github:holochain-open-dev/file-storage/nixify";
    profiles.url = "github:holochain-open-dev/profiles/nixify";
    roles.url = "github:darksoil-studio/roles/develop";
  };

  nixConfig = {
    extra-substituters = [
      "https://holochain-ci.cachix.org"
      "https://holochain-open-dev.cachix.org"
      "https://darksoil-studio.cachix.org"
    ];
    extra-trusted-public-keys = [
      "holochain-ci.cachix.org-1:5IUSkZc0aoRS53rfkvH9Kid40NpyjwCMCzwRTXy+QN8="
      "holochain-open-dev.cachix.org-1:3Tr+9in6uo44Ga7qiuRIfOTFXog+2+YbyhwI/Z6Cp4U="
      "darksoil-studio.cachix.org-1:UEi+aujy44s41XL/pscLw37KEVpTEIn8N/kn7jO8rkc="
    ];
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./happ.nix ];

      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', self', config, pkgs, system, ... }: {

        packages.network =
          (pkgs.callPackage inputs.roles.lib.progenitor-network { }) {
            happ = self'.packages.plenty_happ;
            roles_to_modify = "plenty";
            ui_port = 8888;
          };

        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.p2p-shipyard.devShells.holochainTauriDev
            inputs'.holonix.devShells.default
          ];

          packages = [
            inputs'.scaffolding.packages.hc-scaffold-app-template
            pkgs.mprocs
          ];
        };

        devShells.androidDev = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
            inputs'.holonix.devShells.default
          ];

          packages = [
            inputs'.scaffolding.packages.hc-scaffold-app-template
            pkgs.mprocs
          ];
        };
      };
    };
}
