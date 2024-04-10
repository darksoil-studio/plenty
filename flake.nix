{
  description = "Template for Holochain app development";

  inputs = {
    versions.url  = "github:holochain/holochain?dir=versions/weekly";

    holochain.url = "github:holochain/holochain";
    holochain.inputs.versions.follows = "versions";

    nixpkgs.follows = "holochain/nixpkgs";
    flake-parts.follows = "holochain/flake-parts";

    # tauri-plugin-holochain.url = "github:darksoil-studio/tauri-plugin-holochain";
    tauri-plugin-holochain.url = "/home/guillem/projects/darksoil/tauri-plugin-holochain";
    hc-infra.url = "github:holochain-open-dev/infrastructure/0.300.0-dev";

    # Holochain dependencies (zomes, DNAs and hApps)
    profiles.url = "github:holochain-open-dev/profiles/nixify";
    file-storage.url = "github:holochain-open-dev/file-storage/nixify";
    # Add more repositories here...
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
        specialArgs = {
          ## Special arguments for the flake parts of this repository
          rootPath = ./.;
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
