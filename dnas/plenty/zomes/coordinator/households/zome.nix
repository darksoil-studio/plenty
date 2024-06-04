{ inputs, ... }:

{
  perSystem = { inputs', self', system, pkgs, lib, ... }: {
    packages.households = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
    };

    # Test only this zome and its integrity in isolation
    checks.households = inputs.hc-infra.outputs.lib.sweettest {
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
              - name: households_integrity
          coordinator:
            zomes:
              - name: households
                hash: ~
                dependencies: 
                  - name: households_integrity
                dylib: ~
        '';
        zomes = {
          households = self'.packages.households;
          households_integrity = self'.packages.households_integrity;
        };
        holochain = inputs'.holochain;
      });
      crateCargoToml = ./Cargo.toml;
      buildInputs = inputs.p2p-shipyard.outputs.lib.tauriHappDeps.buildInputs {
        inherit pkgs lib;
      };
      nativeBuildInputs =
        inputs.p2p-shipyard.outputs.lib.tauriHappDeps.nativeBuildInputs {
          inherit pkgs lib;
        };
      cargoArtifacts = inputs.p2p-shipyard.outputs.lib.tauriHappCargoArtifacts {
        inherit pkgs lib;
      };
    };

  };
}

