{
  description = "Template for Holochain app development";

  inputs = {
    file-storage.url = "github:holochain-open-dev/file-storage/nixify";
    profiles.url = "github:holochain-open-dev/profiles/nixify";

    versions.url  = "github:holochain/holochain/0.3.0-beta-dev.45?dir=versions/weekly";
    holochain.url = "github:holochain/holochain";
    holochain.inputs.versions.follows = "versions";

    nixpkgs.follows = "holochain/nixpkgs";
    flake-parts.follows = "holochain/flake-parts";

    tauri-plugin-holochain = {
      url = "github:darksoil-studio/tauri-plugin-holochain";
      # url = "/home/guillem/projects/darksoil/tauri-plugin-holochain";
      inputs.holochain.follows = "holochain";
    };
    hc-infra = {
      url = "github:holochain-open-dev/infrastructure";
      inputs.holochain.follows = "holochain";
    };
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
        specialArgs = {
          ## Special arguments for the flake parts of this repository
          rootPath = ./.;
          excludedCrates = ["plenty"];
        };
      }
      {
        imports = [
          ./happ.nix
        ];
      
        systems = builtins.attrNames inputs.holochain.devShells;
        perSystem =
          { inputs'
          , config
          , pkgs
          , system
          , ...
          }: {
            devShells.default = pkgs.mkShell {
              inputsFrom = [
                inputs'.hc-infra.devShells.synchronized-pnpm
                inputs'.tauri-plugin-holochain.devShells.holochainTauriDev 
              ];

              packages = [
                inputs'.tauri-plugin-holochain.packages.hc-scaffold
              ];
            };

            devShells.androidDev = pkgs.mkShell {
              inputsFrom = [ 
                inputs'.hc-infra.devShells.synchronized-pnpm
                inputs'.tauri-plugin-holochain.devShells.holochainTauriAndroidDev 
              ];

              packages = [
                inputs'.tauri-plugin-holochain.packages.hc-scaffold
              ];
            };
          };
      };
}
