{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
  ];
  idx.extensions = [
    
  ];
  idx.previews = {
    previews = {
      web = {
        command = [
          "bash"
          "-c"
          "cd apps/web && npm run dev -- --port $PORT --hostname 0.0.0.0"
        ];
        manager = "web";
      };
    };
  };
}