{ inputs, ... }:

{
  perSystem =
    { inputs'
    , self'
    , system
    , ...
    }: {
      packages.orders = inputs.hc-infra.outputs.lib.rustZome {
        workspacePath = inputs.self.outPath;
        holochain = inputs'.holochain;
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts =
          inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
      };

      # Test only this zome and its integrity in isolation
      checks.orders= inputs.hc-infra.outputs.lib.sweettest {
        workspacePath = inputs.self.outPath;
        holochain = inputs'.holochain;
        dna = (inputs.hc-infra.outputs.lib.dna {
          dnaManifest = builtins.toFile "dna.yaml" ''
            ---
            manifest_version: "1"
            name: test_dna
            integrity:
              network_seed: ~
              properties: ~
              origin_time: 1709638576394039
              zomes: 
                - name: orders_integrity
            coordinator:
              zomes:
                - name: orders
                  hash: ~
                  dependencies: 
                    - name: orders_integrity
                  dylib: ~
          '';
          zomes = {
            orders_integrity = self'.packages.orders_integrity;
            orders = packages.orders;
          };
          holochain = inputs'.holochain;
        });
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts = inputs.hc-infra.outputs.lib.holochainCargoArtifacts {
          inherit system;
        };
      };

    };
}

