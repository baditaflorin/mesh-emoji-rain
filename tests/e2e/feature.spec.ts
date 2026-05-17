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
