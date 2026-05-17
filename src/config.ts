import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-emoji-rain",
  description: "Tap an emoji — it rains on every peer's screen for 5 seconds. No login, no rounds.",
  accentHex: "#f5a524",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
