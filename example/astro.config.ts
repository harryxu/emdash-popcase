import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { popcase, popcaseIntegration } from "emdash-popcase";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    react(),
    popcaseIntegration(),
    emdash({
      // Keep fixture builds independent of external font downloads.
      fonts: false,
      plugins: [popcase()],
      database: sqlite({ url: "file:./data.db" }),
      storage: local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" }),
    }),
  ],
  devToolbar: { enabled: false },
});
