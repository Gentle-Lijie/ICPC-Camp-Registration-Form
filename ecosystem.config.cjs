module.exports = {
  apps: [
    {
      name: 'icpc-camp-registration',
      cwd: __dirname,
      script: 'pnpm',
      args: 'start:3003',
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
};
