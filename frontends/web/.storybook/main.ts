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
      appDirectory: true,
      nextConfigPath: "../next.config.ts",
      builder: {
        useSWC: false,
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
    return config;
  },
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs
