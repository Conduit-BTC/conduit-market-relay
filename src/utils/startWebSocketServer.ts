// server.ts
import { webSocketService } from "@/services/webSocket/webSocketService.ts";

export async function startWebSocketServer({ enablePeriodicMetricsLogging = false }: { enablePeriodicMetricsLogging?: boolean } = {}) {
    try {
        console.log("Starting WebSocket server...");

        const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
        for (const signal of signals) {
            Deno.addSignalListener(signal, async () => {
                console.log(`\n${signal} received. Shutting down gracefully...`);
                await webSocketService.shutdown();
                Deno.exit(0);
            });
        }

        const service = await webSocketService.initialize({
            port: 8080,
            hostname: "localhost",
            path: "/",
            verifyClient: () => {
                return true; // Accepting all connections
            }
        });

        const checkServer = async () => {
            try {
                const response = await fetch("http://localhost:8080");
                if (response.status === 404) { // Expected response for non-WebSocket requests
                    console.log("✅ Server is running and responding to HTTP requests");
                }
            } catch (error) {
                console.error("❌ Server health check failed:", error);
            }
        };

        setTimeout(checkServer, 1000);

        if (enablePeriodicMetricsLogging) setInterval(() => {
            const metrics = service.getMetrics();
            console.log("\nServer Metrics:", {
                activeConnections: metrics.activeConnections,
                totalConnections: metrics.totalConnections,
                totalMessages: metrics.totalMessages,
                errors: metrics.errors,
                uptime: Math.floor(metrics.uptime),
            });
        }, 10000);

    } catch (error) {
        console.error("Failed to start server:", error);
        Deno.exit(1);
    }
}
