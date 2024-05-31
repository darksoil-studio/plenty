{ inputs, ... }:

{
  perSystem = { inputs', ... }: {
    packages.households_integrity = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      crateCargoToml = ./Cargo.toml;
    };
  };
}
