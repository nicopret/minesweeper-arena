const Module = require("module");
const path = require("path");

const configPath = path.resolve(__dirname, "./next-config.js");
const swcPath = path.resolve(__dirname, "./next-swc.js");
const realSwcPath = require.resolve("next/dist/build/swc");

process.env.NEXT_STORYBOOK_SWC_PATH = realSwcPath;
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "next/config") {
    return configPath;
  }

  if (request === "next/dist/build/swc") {
    return swcPath;
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
