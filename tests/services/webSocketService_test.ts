import { delay } from "@std/async";
import { eventBus } from "@/events/eventBus.ts";
import { assert, assertExists } from "@std/assert";
import { webSocketService } from "@/services/webSocket/webSocketService.ts";

Deno.test({
  name: "webSocketService - connection and message handling",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const PORT = 8080;

    const options = {
      port: PORT,
      path: "/",
      maxPayload: 1024,
      verifyClient: () => true
    };

    await webSocketService.initialize(options);

    const ws = new WebSocket(`ws://localhost:${PORT}/`);

    await new Promise<void>((resolve) => {
      ws.addEventListener('open', (event) => {
        assert(event.type === 'open');
        resolve()
      }, { once: true });
    });

    const testMessage = [ 'EVENT', { 'some': 'data' } ];

    ws.send(JSON.stringify(testMessage));

    let connectionId: string;

    ws.addEventListener('message', (event) => {
      const receivedMessage = JSON.parse(event.data);
      assert(receivedMessage.type === 'CONNECTED');
      assertExists(receivedMessage.payload.connectionId);
      connectionId = receivedMessage.payload.connectionId;
    });

    eventBus.subscribeOnce('WS_MESSAGE', (event) => {
      assert(event.connectionId === connectionId);
    });

    // Test metrics
    const metrics = webSocketService.getMetrics();
    assert(metrics.uptime > 0);
    assert(metrics.errors === 0);
    assert(metrics.totalConnections === 1);
    assert(metrics.activeConnections === 1);
    assert(metrics.lastError === undefined);

    // Cleanup
    ws.close();
    await delay(100);
    await webSocketService.shutdown();
  }
});

Deno.test("webSocketService - broadcasting messages", async () => {
  const PORT = 8081;

  const options = {
    port: PORT,
    path: "/",
    maxPayload: 1024,
    verifyClient: () => true
  };

  await webSocketService.initialize(options);

  await delay(100);

  const client1 = new WebSocket(`ws://localhost:${PORT}/`);
  const client2 = new WebSocket(`ws://localhost:${PORT}/`);

  client1.addEventListener('error', (error) => console.error('Client 1 error:', error));
  client2.addEventListener('error', (error) => console.error('Client 2 error:', error));

  await Promise.all([
    new Promise<void>((resolve) => {
      client1.addEventListener('open', () => {
        resolve();
      }, { once: true });
    }),
    new Promise<void>((resolve) => {
      client2.addEventListener('open', () => {
        resolve();
      }, { once: true });
    })
  ]);


  await Promise.all([
    new Promise<void>((resolve) => {
      client1.addEventListener('message', () => {
        resolve();
      }, { once: true });
    }),
    new Promise<void>((resolve) => {
      client2.addEventListener('message', () => {
        resolve();
      }, { once: true });
    })
  ]);

  const broadcastMessage = { type: "broadcast", data: "Hello everyone!" };

  const messagePromises = [
    new Promise<string>((resolve) => {
      client1.addEventListener('message', (event) => {
        console.log("Client 1 broadcast received:", event.data);
        resolve(event.data);
      }, { once: true });
    }),
    new Promise<string>((resolve) => {
      client2.addEventListener('message', (event) => {
        console.log("Client 2 broadcast received:", event.data);
        resolve(event.data);
      }, { once: true });
    })
  ];

  console.log("Broadcasting message:", broadcastMessage);
  await webSocketService.broadcast(broadcastMessage);
  console.log("Broadcast sent");

  const receivedMessages = await Promise.all(messagePromises);
  console.log("All messages received:", receivedMessages);

  receivedMessages.forEach(msg => {
    const parsed = JSON.parse(msg);
    assert(parsed.type === broadcastMessage.type);
    assert(parsed.data === broadcastMessage.data);
  });

  // Cleanup
  client1.close();
  client2.close();
  await delay(100);
  await webSocketService.shutdown();
});
