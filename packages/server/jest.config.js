import { jestConfig } from "../config/jest.config.mjs";

/** @type {import('jest').Config} */
export default {
  ...jestConfig,
  coveragePathIgnorePatterns: ["__tests__/", "/node_modules/", "src/mock/"],

  testTimeout: 10000,
  forceExit: true,
};
