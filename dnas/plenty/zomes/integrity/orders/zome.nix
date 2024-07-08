{ inputs, ... }:

{
  perSystem =
    { inputs'
    , system
    , ...
    }: {
      packages.orders_integrity = inputs.hc-infra.outputs.lib.rustZome {
        workspacePath = inputs.self.outPath;
        holochain = inputs'.holochain;
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts =
          inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
      };
    };
}

