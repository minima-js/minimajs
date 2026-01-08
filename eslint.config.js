import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default defineConfig(
  // Global ignores
  {
    ignores: ["**/lib/**", "**/node_modules/**", "eslint.config.js", ".vitepress", "docs"],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (non type-checked – fast & safe for monorepos)
  ...tseslint.configs.recommended,

  // Bun / ESM environment
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Bun: "readonly",
      },
    },
  },

  {
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // Prettier
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },

  // Disable conflicting stylistic rules
  prettierConfig
);
