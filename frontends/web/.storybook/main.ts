import path from "path";
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "@storybook/addon-viewport",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {
      // Avoid Next app-router integration, which breaks Storybook's webpack child compiler in this setup.
      appDirectory: false,
      nextConfigPath: "../next.config.ts",
      builder: {
        useSWC: true,
      },
    },
  },
  staticDirs: ["../public"],
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "next/config": path.resolve(__dirname, "./next-config.js"),
    };
    // Use in-memory cache to avoid filesystem cache shutdown bug seen with Storybook/Next on Node 22.
    config.cache = { type: "memory" };
    // ReactRefreshPlugin breaks Storybook's HTML child compiler; remove it here.
    config.plugins = (config.plugins || []).filter(
      (plugin) => plugin?.constructor?.name !== "ReactRefreshPlugin",
    );
    // Debug: log plugin list to spot incompatible plugins when Storybook fails.
    // Remove once Storybook build is stable.
    // eslint-disable-next-line no-console
    console.log(
      "Storybook webpack plugins:",
      (config.plugins || []).map((plugin) => plugin?.constructor?.name),
    );
    // Surface child compilation errors to help debug Next/Webpack integration issues.
    config.stats = {
      ...(config.stats || {}),
      children: true,
      errorDetails: true,
    };
    return config;
  },
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs
