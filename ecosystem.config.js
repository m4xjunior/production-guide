module.exports = {
  apps: [
    {
      name: "p2v",
      script: "node_modules/.bin/next",
      args: "start --port 3000",
      cwd: "/Users/maxmeireles/Library/Mobile Documents/com~apple~CloudDocs/Proyectos/Proyectos Abiertos/production-guide-main",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/tmp/p2v-error.log",
      out_file: "/tmp/p2v-out.log",
    },
  ],
};
