{ inputs, allDnas, ... }:

{
  # Import all `dnas/*/dna.nix` files
  imports = (
    map (m: "${./.}/dnas/${m}/dna.nix")
      (builtins.attrNames (if builtins.pathExists ./dnas then builtins.readDir ./dnas else {} ))
  );

  perSystem =
    { inputs'
    , lib
    , self'
    , ...
    }: {
  	  packages.plenty = inputs.hcInfra.outputs.lib.happ {
        holochain = inputs'.holochain;
        happManifest = ./workdir/happ.yaml;
        dnas = {
          # Override specific dnas here, e.g.:
          # my_dna = inputs'.some_input.packages.my_dna;
        };
      };
  	};
}
