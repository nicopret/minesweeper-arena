/* eslint-disable @typescript-eslint/no-require-imports */
const swc = require(
  process.env.NEXT_STORYBOOK_SWC_PATH || "next/dist/build/swc",
);

let bindingsReady = false;

async function ensureBindings() {
  if (bindingsReady) {
    return;
  }

  if (typeof swc.loadBindings === "function") {
    await swc.loadBindings();
  }

  bindingsReady = true;
}

async function isWasm() {
  await ensureBindings();
  return false;
}

async function transform(...args) {
  await ensureBindings();
  return swc.transform(...args);
}

function transformSync(...args) {
  bindingsReady = true;
  return swc.transformSync(...args);
}

module.exports = {
  ...swc,
  isWasm,
  transform,
  transformSync,
};
