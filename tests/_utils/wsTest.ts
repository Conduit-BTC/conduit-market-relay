// wsTest.ts
import { delay } from "https://deno.land/std/async/delay.ts";

class WebSocketTester {
  private ws: WebSocket | null = null;
  private connectionTimeout: number = 5000; // 5 seconds

  async testConnection(url: string): Promise<void> {
    console.log(`\n🔍 Testing WebSocket connection to ${url}`);

    try {
      // 1. Test if the server is accessible
      const httpResponse = await fetch(url.replace('ws:', 'http:'));
      console.log(`\n📡 Server Response:`);
      console.log(`Status: ${httpResponse.status} ${httpResponse.statusText}`);
      console.log(`Headers: ${JSON.stringify(Object.fromEntries(httpResponse.headers), null, 2)}`);

      // 2. Attempt WebSocket connection
      console.log('\n🔌 Attempting WebSocket connection...');

      const connectPromise = new Promise((resolve, reject) => {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ Connection established successfully');
          resolve('connected');
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log(`📴 Connection closed: Code ${event.code} - ${event.reason || 'No reason provided'}`);
        };
      });

      // 3. Wait for connection with timeout
      await Promise.race([
        connectPromise,
        delay(this.connectionTimeout).then(() => {
          throw new Error(`Connection timeout after ${this.connectionTimeout}ms`);
        })
      ]);

      // 4. Test basic message exchange if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('\n📤 Testing message sending...');
        this.ws.send(JSON.stringify({ type: 'TEST', payload: 'Hello Server!' }));

        await delay(1000); // Wait for potential response

        // 5. Clean up
        if (this.ws) {
          this.ws.close(1000, 'Test complete');
        }
      }

    } catch (error) {
      console.error('\n❌ Connection test failed:', error);
      console.log('\n🔍 Troubleshooting suggestions:');
      console.log('1. Verify the server is running and listening on the specified port');
      console.log('2. Check if the port is blocked by firewall');
      console.log('3. Ensure no other service is using port 8080');
      console.log('4. Try running `netstat -an | grep 8080` to check port status');
      console.log('5. Verify ALLOWED_ORIGINS environment variable if set');
    }
  }
}

// Usage
const tester = new WebSocketTester();
await tester.testConnection('ws://localhost:8080');
