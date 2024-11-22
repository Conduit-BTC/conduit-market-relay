// startGraphQLServer.ts
import { createYoga } from "graphql-yoga";
import { schema } from "@/graphql/schema.ts";
import { serve } from "https://deno.land/std/http/server.ts";

interface GraphQLServerOptions {
  port?: number;
  hostname?: string;
  path?: string;
  enablePlayground?: boolean;
  enableIntrospection?: boolean;
  enablePeriodicMetricsLogging?: boolean;
}

export function startGraphQLServer({
  port = 4000,
  hostname = "localhost",
  path = "/graphql",
  enablePlayground = true,
  enableIntrospection = true,
  enablePeriodicMetricsLogging = false,
}: GraphQLServerOptions = {}) {
  try {
    console.log("\n=== Starting GraphQL Server ===");
    console.log("Time:", new Date().toISOString());
    console.log(`Environment: ${Deno.env.get("DENO_ENV") || "development"}`);

    // Initialize metrics
    const metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      errors: 0,
      lastError: null as Error | null,
    };

    // Create Yoga instance with enhanced configuration
    const yoga = createYoga({
      schema,
      graphiql: enablePlayground,
      landingPage: false,
      maskedErrors: !enableIntrospection,
      cors: {
        origin: Deno.env.get("ALLOWED_ORIGINS")?.split(",") || ["localhost"],
        credentials: true,
      },
      plugins: [
        // Custom plugin for metrics
        {
          onRequest({ request }) {
            metrics.totalRequests++;
            console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
          },
          onExecute({ args }: any) {
            if (enablePeriodicMetricsLogging) {
              console.log("Executing GraphQL operation:", {
                operation: args.operationName || "anonymous",
                variables: args.variableValues,
              });
            }
          },
          onError({ error }: any) {
            metrics.errors++;
            metrics.lastError = error;
            console.error("GraphQL Error:", {
              message: error.message,
              path: error.path,
              stack: error.originalError?.stack,
            });
          },
        },
      ],
    });

    const abortController = new AbortController();
    const server = serve(async (req) => {
      // Handle GraphQL requests
      if (new URL(req.url).pathname === path) {
        return yoga.handleRequest(req, {});
      }

      // Handle other routes
      return new Response("Not Found", { status: 404 });
    }, {
      port,
      hostname,
      signal: abortController.signal,
      onListen: ({ hostname, port }) => {
        console.log(`\n✅ GraphQL server is running at http://${hostname}:${port}${path}`);
        if (enablePlayground) {
          console.log(`📝 GraphQL Playground available at http://${hostname}:${port}${path}`);
        }
      },
    });

    // Graceful shutdown handling
    const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      Deno.addSignalListener(signal, async () => {
        console.log(`\n${signal} received. Shutting down GraphQL server...`);
        abortController.abort();
        console.log("GraphQL server shutdown complete");
      });
    }

    // Periodic metrics logging
    if (enablePeriodicMetricsLogging) {
      setInterval(() => {
        const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
        console.log("\nGraphQL Server Metrics:", {
          uptime: `${uptime}s`,
          totalRequests: metrics.totalRequests,
          errors: metrics.errors,
          lastError: metrics.lastError?.message,
        });
      }, 30000);
    }

    // Health check
    const checkServer = async () => {
      try {
        const response = await fetch(`http://${hostname}:${port}${path}`);
        if (response.status === 400) { // GraphQL returns 400 for empty queries
          console.log("✅ GraphQL server health check passed");
        }
      } catch (error) {
        console.error("❌ GraphQL server health check failed:", error);
      }
    };
    setTimeout(checkServer, 1000);

    return { server, metrics, shutdown: () => abortController.abort() };
  } catch (error) {
    console.error("Failed to start GraphQL server:", error);
    throw error;
  }
}
