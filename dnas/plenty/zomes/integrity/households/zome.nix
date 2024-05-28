{ inputs, rootPath, ... }:

{
  perSystem = { inputs', ... }: {
    packages.households_integrity = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = rootPath;
      holochain = inputs'.holochain;
      crateCargoToml = ./Cargo.toml;
    };
  };
}

