"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => callback();
  window.addEventListener("storage", handleChange);
  window.addEventListener("product-pulse-storage-change", handleChange as EventListener);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(
      "product-pulse-storage-change",
      handleChange as EventListener
    );
  };
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) !== "false" ? fallback : false;
}

export function writeStoredBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
  window.dispatchEvent(new Event("product-pulse-storage-change"));
}

export function useStoredBoolean(key: string, fallback = true) {
  return useSyncExternalStore(
    subscribe,
    () => readStoredBoolean(key, fallback),
    () => fallback
  );
}
