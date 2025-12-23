import { jestConfig } from "../config/jest.config.mjs";

/** @type {import('jest').Config} */
export default {
  ...jestConfig,
  testTimeout: 2000,
  forceExit: true,
};
