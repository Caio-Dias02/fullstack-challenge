require('reflect-metadata');
require('tsconfig-paths').register({
  baseUrl: '.',
  paths: {
    '@fullstack-challenge/types': ['dist/packages/types'],
    '@fullstack-challenge/types/*': ['dist/packages/types/*']
  }
});
require('./dist/apps/notifications-service/src/main.js');
