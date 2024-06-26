{
  description = "Template for Holochain app development";

  inputs = {
    notifications.url = "github:darksoil-studio/notifications";
    file-storage.url = "github:holochain-open-dev/file-storage/nixify";
    profiles.url = "github:holochain-open-dev/profiles/nixify";

    versions.url = "github:holochain/holochain?dir=versions/0_3";
    holochain.url = "github:holochain/holochain";
    holochain.inputs.versions.follows = "versions";

    nixpkgs.follows = "holochain/nixpkgs";
    flake-parts.follows = "holochain/flake-parts";

    p2p-shipyard.url = "github:darksoil-studio/p2p-shipyard";
    hc-infra.url = "github:holochain-open-dev/infrastructure";
    scaffolding.url = "github:holochain-open-dev/templates";
  };

  nixConfig = {
    extra-substituters = [
      "https://holochain-open-dev.cachix.org"
      "https://darksoil-studio.cachix.org"
    ];
    extra-trusted-public-keys = [
      "holochain-open-dev.cachix.org-1:3Tr+9in6uo44Ga7qiuRIfOTFXog+2+YbyhwI/Z6Cp4U="
      "darksoil-studio.cachix.org-1:UEi+aujy44s41XL/pscLw37KEVpTEIn8N/kn7jO8rkc="
    ];
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./happ.nix ];

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem = { inputs', config, pkgs, system, ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.p2p-shipyard.devShells.holochainTauriDev
          ];

          packages = [ inputs'.scaffolding.packages.hc-scaffold-app-template ];
        };

        devShells.androidDev = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
          ];

          packages = [ inputs'.scaffolding.packages.hc-scaffold-app-template ];
        };
      };
    };
}
