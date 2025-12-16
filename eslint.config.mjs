import { defineConfig, globalIgnores } from "eslint/config";
import path from "path";
import { fileURLToPath } from "url";
import nextPlugin from "@next/eslint-plugin-next";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseTsConfig = {
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: path.join(__dirname, "tsconfig.base.json"),
      tsconfigRootDir: __dirname,
    },
  },
};

const eslintConfig = defineConfig([
  {
    ...baseTsConfig,
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "react-hooks/set-state-in-effect": "off",
    },
    settings: {
      next: {
        rootDir: ["./frontends/web"],
      },
    },
  },
  globalIgnores([
    ".next/**",
    "frontends/**/.next/**",
    "out/**",
    "frontends/**/out/**",
    "build/**",
    "frontends/**/build/**",
    "next-env.d.ts",
    "frontends/**/next-env.d.ts",
    "coverage/**",
  ]),
  {
    ...baseTsConfig,
    files: ["**/*.{test,spec}.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    plugins: {
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      ...testingLibrary.configs.react.rules,
      ...jestDom.configs.recommended.rules,
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ...baseTsConfig,
    files: ["tests/playwright/**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "testing-library/prefer-screen-queries": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
