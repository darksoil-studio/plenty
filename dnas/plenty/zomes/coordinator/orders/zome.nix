{ inputs, ... }:

{
  perSystem = { inputs', self', system, pkgs, lib, ... }: {
    packages.orders = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      inherit system;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
    };
  };
}

