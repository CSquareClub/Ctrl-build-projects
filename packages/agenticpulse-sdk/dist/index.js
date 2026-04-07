"use strict";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("agenticpulse-sdk must be used in a browser environment.");
  }
}

function ensureSdk() {
  ensureBrowser();

  if (!window.AgenticPulse) {
    require("./agenticpulse.js");
  }

  if (!window.AgenticPulse) {
    throw new Error("AgenticPulse SDK failed to initialize.");
  }

  return window.AgenticPulse;
}

function init(config) {
  return ensureSdk().init(config);
}

function track(eventName, data) {
  return ensureSdk().track(eventName, data);
}

function feedback(payload) {
  return ensureSdk().feedback(payload);
}

function flush() {
  return ensureSdk().flush();
}

module.exports = {
  init,
  track,
  feedback,
  flush,
  get AgenticPulse() {
    return typeof window !== "undefined" ? window.AgenticPulse : undefined;
  },
};
