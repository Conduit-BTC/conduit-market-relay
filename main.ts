import "@/events/eventBus.ts";
import { startWebSocketServer } from "@/utils/startWebSocketServer.ts";

try {
  await Promise.all([
    startWebSocketServer(),
 ]);

  addEventListener("error", (event) => {
    console.error("Unhandled error:", event.error);
  });

  addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });

} catch (error) {
  console.error("Failed to start server", error);
  Deno.exit(1);
}
