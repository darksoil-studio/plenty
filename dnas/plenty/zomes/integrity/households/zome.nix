{ inputs, rootPath, excludedCrates, ... }:

{
  perSystem =
    { inputs'
    , ...
    }: {
      packages.households_integrity = inputs.hc-infra.outputs.lib.rustZome {
        inherit excludedCrates;
        workspacePath = rootPath;
        holochain = inputs'.holochain;
        crateCargoToml = ./Cargo.toml;
      };
    };
}

