{ inputs, ... }:

{
  # Import all ./zomes/coordinator/*/zome.nix and ./zomes/integrity/*/zome.nix  
  imports = (map (m: "${./.}/zomes/coordinator/${m}/zome.nix")
    (builtins.attrNames (builtins.readDir ./zomes/coordinator)))
    ++ (map (m: "${./.}/zomes/integrity/${m}/zome.nix")
      (builtins.attrNames (builtins.readDir ./zomes/integrity)));
  perSystem = { inputs', self', lib, ... }: {
    packages.plenty_dna = inputs.hc-infra.outputs.lib.dna {
      dnaManifest = ./workdir/dna.yaml;
      holochain = inputs'.holochain;
      zomes = {
        notifications_integrity =
          inputs'.notifications.packages.notifications_integrity;
        notifications = inputs'.notifications.packages.notifications;

        roles_integrity = inputs'.roles.packages.roles_integrity;
        roles = inputs'.roles.packages.roles;

        file_storage_integrity =
          inputs'.file-storage.packages.file_storage_integrity;
        file_storage = inputs'.file-storage.packages.file_storage;
        # Include here the zome packages for this DNA, e.g.:
        # This overrides all the "bundled" properties for the DNA manifest
        profiles_integrity = inputs'.profiles.packages.profiles_integrity;
        profiles = inputs'.profiles.packages.profiles;

        households_integrity = self'.packages.households_integrity;
        households = self'.packages.households;
        producers_integrity = self'.packages.producers_integrity;
        producers = self'.packages.producers;
      };
    };
  };
}
