{ inputs, ... }:

{
  # Import all `dnas/*/dna.nix` files
  imports = (map (m: "${./.}/dnas/${m}/dna.nix") (builtins.attrNames
    (if builtins.pathExists ./dnas then builtins.readDir ./dnas else { })));

  perSystem = { inputs', lib, self', system, ... }: {
    packages.plenty_happ = inputs.hc-infra.outputs.builders.${system}.happ {
      happManifest = ./workdir/happ.yaml;
      dnas = {
        # Override specific dnas here, e.g.:
        # my_dna = inputs'.some_input.packages.my_dna;
        plenty = self'.packages.plenty_dna;
      };
    };
  };
}
