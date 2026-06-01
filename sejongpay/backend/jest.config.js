'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: [
    '**/src/**/__tests__/**/*.test.js',
    '**/src/**/*.test.js'
  ],
  // runInBand is passed via CLI; set forceExit to clean up async handles
  forceExit: true,
  // Collect coverage from source files, excluding entry point and scripts
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/scripts/**'
  ]
};
