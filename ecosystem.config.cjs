module.exports = {
  apps: [
    {
      name: "sigesp-backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      kill_timeout: 10000, // Tiempo límite para permitir que el graceful shutdown cierre conexiones limpiamente
      listen_timeout: 10000,
    },
  ],
};
