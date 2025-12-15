import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next, including nested app roots:
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
    settings: {
      next: {
        rootDir: ["./frontends/web"],
      },
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    plugins: {
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
    },
    rules: {
      ...testingLibrary.configs.react.rules,
      ...jestDom.configs.recommended.rules,
    },
  },
  {
    files: ["tests/playwright/**/*.{ts,tsx}"],
    rules: {
      "testing-library/prefer-screen-queries": "off",
    },
  },
]);

export default eslintConfig;
