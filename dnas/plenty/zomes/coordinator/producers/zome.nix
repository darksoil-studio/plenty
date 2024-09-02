{ inputs, ... }:

{
  perSystem = { inputs', self', lib, pkgs, system, ... }: {
    packages.producers = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      inherit system;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
    };
  };
}

