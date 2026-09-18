/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/test'],
  testRegex: '.*\\.(spec|test)\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^modules/(.*)$': '<rootDir>/src/modules/$1',
    '^common/(.*)$': '<rootDir>/src/common/$1',
    '^config/(.*)$': '<rootDir>/src/config/$1',
    '^config$': '<rootDir>/src/config',
    '^shared/(.*)$': '<rootDir>/src/shared/$1',
    '^database/(.*)$': '<rootDir>/src/database/$1',
  },
  testEnvironment: 'node',
  forceExit: true,
};
