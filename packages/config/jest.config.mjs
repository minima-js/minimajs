/** @type {import('ts-jest').JestConfigWithTsJest} **/

export const jestConfig = {
  testEnvironment: "node",
  rootDir: "src",
  coverageDirectory: "../coverage",
  preset: "ts-jest/presets/default-esm",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+.tsx?$": ["ts-jest", { useESM: true }],
  },
  // Additions to ignore __tests__ directory
  testPathIgnorePatterns: ["<rootDir>/__tests__/", "/node_modules/"],
  coveragePathIgnorePatterns: ["<rootDir>/__tests__/", "/node_modules/"],
};
