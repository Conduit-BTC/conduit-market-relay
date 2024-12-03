import { encodeHex } from "@std/encoding/hex";
import { eventBus } from "@/events/eventBus.ts";
import { WebSocketEvents } from "@/events/eventNames.ts";
import { NostrService } from "@/services/nostrService.ts";

interface ConnectionMetadata {
  ws: WebSocket;
  id: string;
  connectedAt: Date;
  lastPingAt: Date;
  isAlive: boolean;
  messageCount: number;
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
}

export class WebSocketService {
  private static readonly PING_INTERVAL = 30000; // 30 seconds
  private static readonly CONNECTION_TIMEOUT = 120000; // 2 minutes
  private static readonly MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
  private static readonly MAX_CONNECTIONS = 10000;

  private connections: Map<string, ConnectionMetadata>;
  private abortController: AbortController | null;
  private pingInterval: number | null;
  private metrics: {
    totalConnections: number;
    totalMessages: number;
    nostrMessages: number;
    errors: number;
    lastError?: Error;
  };

  constructor() {
    this.connections = new Map();
    this.abortController = null;
    this.pingInterval = null;
    this.metrics = {
      totalConnections: 0,
      totalMessages: 0,
      nostrMessages: 0,
      errors: 0,
    };
  }

  initialize(options: {
    port?: number;
    hostname?: string;
    path?: string;
    maxPayload?: number;
    verifyClient?: (request: Request) => boolean | Promise<boolean>;
  } = {}): Promise<WebSocketService> {
    const {
      port = 8080,
      hostname = "localhost",
      path = '/',
      verifyClient = WebSocketService.defaultVerifyClient,
    } = options;

    this.abortController = new AbortController();

    return new Promise((resolve) => {
      Deno.serve(
        {
          port,
          hostname,
          signal: this.abortController?.signal,
          onListen: () => resolve(this),
          onError: (error: any) => {
            this.handleError(error);
            return new Response("Internal Server Error", { status: 500 });
          },
        },

        async (request) => {
          if (new URL(request.url).pathname === path) {
            try {
              if (!await verifyClient(request)) {
                return new Response("Unauthorized", { status: 401 });
              }

              if (request.headers.get("upgrade") != "websocket") {
                return new Response("Expected WebSocket upgrade", { status: 426 });
              }

              const { socket, response } = Deno.upgradeWebSocket(request);
              await this.handleConnection(socket);
              return response;
            } catch (error: any) {
              this.handleError(error);
              return new Response("WebSocket upgrade failed", { status: 500 });
            }
          }
          return new Response("Not found", { status: 404 });
        }
      );
      console.log(`WebSocket server running at ws://${hostname}:${port}${path}`);
      this.pingInterval = setInterval(() => this.checkConnections(), WebSocketService.PING_INTERVAL);
    });
  }

  private static defaultVerifyClient(request: Request): boolean {
    const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(',') || ['localhost'];
    const origin = request.headers.get("origin") || "localhost";
    return allowedOrigins.includes(origin);
  }

  private static async generateConnectionId(): Promise<string> {
    const uniqueString = `${Date.now()}-${Math.random()}`;
    const messageBuffer = new TextEncoder().encode(uniqueString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
    return encodeHex(new Uint8Array(hashBuffer));
  }

  private async handleConnection(ws: WebSocket): Promise<void> {
    if (this.connections.size >= WebSocketService.MAX_CONNECTIONS) {
      ws.close(1013, 'Maximum connections reached');
      return;
    }

    const connectionId = await WebSocketService.generateConnectionId();
    const metadata: ConnectionMetadata = {
      ws,
      id: connectionId,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      isAlive: true,
      messageCount: 0,
    };

    this.connections.set(connectionId, metadata);
    this.metrics.totalConnections++;

    ws.addEventListener("message", (event) => this.handleMessage(ws, event));
    ws.addEventListener("close", () => this.handleDisconnect(connectionId));
    ws.addEventListener("error", (event: any) => this.handleError(event.error));
    ws.addEventListener("open", async () => {
      try {
        await WebSocketService.sendMessage(ws, {
          type: 'CONNECTED',
          payload: { connectionId }
        });
        eventBus.emit(WebSocketEvents.WS_CONNECTED, { connectionId, timestamp: new Date() });
      } catch (error: any) {
        this.handleError(error);
      }
    });
  }

  private handleMessage(ws: WebSocket, event: MessageEvent): void {
    const metadata = Array.from(this.connections.entries())
      .find(([_, meta]) => meta.ws === ws)?.[1];

    if (!metadata) return;

    metadata.messageCount++;
    this.metrics.totalMessages++;

    try {
      WebSocketService.route(ws, event.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }



  static route(ws: WebSocket, data: unknown): void {
    const {success, message} = NostrService.validateMessage(data, WebSocketService.MAX_MESSAGE_SIZE);

      if (!success) {
        WebSocketService.sendMessage(ws, {
          type: 'ERROR',
          payload: {
            error: message,
            message: data,
            code: 'INVALID_FORMAT'
          }
        });
        return;
      }

      NostrService.route(ws, message);
  }

  private handleDisconnect(connectionId: string): void {
    const metadata = this.connections.get(connectionId);
    if (metadata) {
      this.connections.delete(connectionId);
      eventBus.emit(WebSocketEvents.WS_DISCONNECTED, {
        connectionId,
        timestamp: new Date(),
        messageCount: metadata.messageCount
      });
    }
  }

  private handleError(error: Error): void {
    this.metrics.errors++;
    this.metrics.lastError = error;
    eventBus.emit(WebSocketEvents.WS_ERROR, {
      error,
      timestamp: new Date()
    });
    console.error('WebSocket error:', error);
  }

  private checkConnections(): void {
    const now = Date.now();

    for (const [id, metadata] of this.connections) {
      if (!metadata.isAlive) {
        metadata.ws.close(1000, "Connection timeout");
        this.connections.delete(id);
        continue;
      }

      if (now - metadata.lastPingAt.getTime() > WebSocketService.CONNECTION_TIMEOUT) {
        metadata.ws.close(1000, "Connection timeout");
        this.connections.delete(id);
        continue;
      }

      try {
        metadata.ws.send(new Uint8Array([9])); // ping frame
        metadata.isAlive = false;
      } catch (error: any) {
        this.handleError(error);
        this.connections.delete(id);
      }
    }
  }

  static sendMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        ws.send(JSON.stringify(message));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async broadcast(message: WebSocketMessage, filter?: (metadata: ConnectionMetadata) => boolean): Promise<void> {
    const sendPromises = Array.from(this.connections.values())
      .filter(metadata => !filter || filter(metadata))
      .map(metadata => WebSocketService.sendMessage(metadata.ws, message));

    await Promise.all(sendPromises);
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.connections.size,
      uptime: performance.now() / 1000, // Convert to seconds
    };
  }

  async shutdown(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    const closePromises = Array.from(this.connections.values()).map(metadata => {
      return new Promise<void>((resolve) => {
        metadata.ws.close(1001, 'Server shutting down');
        resolve();
      });
    });

    await Promise.all(closePromises);
    this.connections.clear();
  }
}

export const webSocketService = new WebSocketService();
