import { jestConfig } from "../config/jest.config.mjs";

/** @type {import('jest').Config} */
export default {
  ...jestConfig,
  coverageReporters: ["html"],
  testTimeout: 10000,
  forceExit: true,
};
