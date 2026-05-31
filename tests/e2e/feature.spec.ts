import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("emoji tapped on peer A rains + toasts on peer B", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    // Brief settle so the __mesh_names map propagates across BroadcastChannel
    // before the toast lookup runs on peer B.
    await a.waitForTimeout(400);

    await a.getByRole("button", { name: "rain 🎉", exact: true }).click();

    // Peer B sees the drop counter advance (Y.Array sync) and the credited
    // toast appear (Y.Array sync + names-map lookup).
    await expect(b.locator(".emoji-status")).toContainText(/1 raining/);
    await expect(b.locator(".mesh-toast")).toContainText("alice");
    await expect(b.locator(".mesh-toast")).toContainText("🎉");
  } finally {
    await cleanup();
  }
});

test("the actual falling-emoji effect rains on the OTHER peer's screen (both directions)", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(400);

    // The advertised promise: "tap an emoji → it rains on EVERY peer's
    // screen". Assert the literal rain effect — the `.emoji-drop` DOM node
    // inside `.emoji-rain-layer` — appears on the peer that did NOT tap.

    // A taps 🎉 → B's rain layer must render a 🎉 drop (not just a counter).
    await a.getByRole("button", { name: "rain 🎉", exact: true }).click();
    const bDrop = b.locator(".emoji-rain-layer .emoji-drop", { hasText: "🎉" });
    await expect(bDrop.first()).toBeVisible();

    // B taps 🔥 → A's rain layer must render a 🔥 drop. Proves the broadcast
    // is symmetric, not a one-way local-render-plus-counter illusion.
    await b.getByRole("button", { name: "rain 🔥", exact: true }).click();
    const aDrop = a.locator(".emoji-rain-layer .emoji-drop", { hasText: "🔥" });
    await expect(aDrop.first()).toBeVisible();

    // Both peers should now be rendering both peers' drops (shared Y.Array).
    await expect(a.locator(".emoji-rain-layer .emoji-drop")).toHaveCount(2);
    await expect(b.locator(".emoji-rain-layer .emoji-drop")).toHaveCount(2);
  } finally {
    await cleanup();
  }
});
