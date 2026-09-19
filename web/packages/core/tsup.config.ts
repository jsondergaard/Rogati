import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    posthog: "src/posthog.ts",
    "google-consent-mode": "src/google-consent-mode.ts",
    script: "src/script.ts",
    plausible: "src/plausible.ts",
    fathom: "src/fathom.ts",
    "meta-pixel": "src/meta-pixel.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
})
