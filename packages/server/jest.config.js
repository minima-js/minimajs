import { jestConfig } from "../config/jest.config.mjs";

export default {
  ...jestConfig,
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/helpers/",
  ],
  testTimeout: 10000,
  forceExit: true,
};
