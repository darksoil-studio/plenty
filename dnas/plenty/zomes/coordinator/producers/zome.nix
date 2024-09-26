{ inputs, ... }:

{
  perSystem = { inputs', self', lib, pkgs, system, ... }: {
    packages.producers = inputs.hc-infra.outputs.builders.${system}.rustZome {
      workspacePath = inputs.self.outPath;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts = inputs'.hc-infra.packages.zomeCargoArtifacts;
    };
  };
}

