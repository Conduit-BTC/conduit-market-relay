import "@/events/eventBus.ts";
import { startWebSocketServer } from "@/utils/startWebSocketServer.ts";
import { startGraphQLServer } from "@/utils/startGraphQLServer.ts";

try {
  await Promise.all([
    startWebSocketServer(),
    startGraphQLServer({
      port: 4000,
      enablePlayground: true,
    })
  ]);

  addEventListener("error", (event) => {
    console.error("Unhandled error:", event.error);
  });

  addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });

} catch (error) {
  console.error("Failed to start servers:", error);
  Deno.exit(1);
}
