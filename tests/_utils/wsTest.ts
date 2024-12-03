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
        this.ws.send(JSON.stringify([
  "REQ",
  "set_home_feeds_web_0.200.4_1505688448",
  {
    "cache": [
      "set_app_subsettings",
      {
        "event_from_user": {
          "content": "{\"subkey\":\"user-home-feeds\",\"settings\":[{\"name\":\"Latest\",\"spec\":\"{\\\"id\\\":\\\"latest\\\",\\\"kind\\\":\\\"notes\\\"}\",\"feedkind\":\"primal\",\"enabled\":true,\"description\":\"Latest notes by your follows\"},{\"name\":\"Latest with Replies\",\"spec\":\"{\\\"id\\\":\\\"latest\\\",\\\"include_replies\\\":true,\\\"kind\\\":\\\"notes\\\"}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Latest notes and replies by your follows\"},{\"name\":\"Trending 7d\",\"spec\":\"{\\\"id\\\":\\\"global-trending\\\",\\\"kind\\\":\\\"notes\\\",\\\"hours\\\":168}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Global trending notes in the past 7 days\"},{\"name\":\"Trending 48h\",\"spec\":\"{\\\"id\\\":\\\"global-trending\\\",\\\"kind\\\":\\\"notes\\\",\\\"hours\\\":48}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Global trending notes in the past 48 hours\"},{\"name\":\"Trending 24h\",\"spec\":\"{\\\"id\\\":\\\"global-trending\\\",\\\"kind\\\":\\\"notes\\\",\\\"hours\\\":24}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Global trending notes in the past 24 hours\"},{\"name\":\"Trending 12h\",\"spec\":\"{\\\"id\\\":\\\"global-trending\\\",\\\"kind\\\":\\\"notes\\\",\\\"hours\\\":12}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Global trending notes in the past 12 hours\"},{\"name\":\"Trending 4h\",\"spec\":\"{\\\"id\\\":\\\"global-trending\\\",\\\"kind\\\":\\\"notes\\\",\\\"hours\\\":4}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Global trending notes in the past 4 hours\"},{\"name\":\"Trending 1h\",\"spec\":\"{\\\"id\\\":\\\"global-trending\\\",\\\"kind\\\":\\\"notes\\\",\\\"hours\\\":1}\",\"feedkind\":\"primal\",\"enabled\":false,\"description\":\"Global trending notes in the past hour\"},{\"name\":\"Nostr Firehose\",\"spec\":\"{\\\"id\\\":\\\"all-notes\\\",\\\"kind\\\":\\\"notes\\\"}\",\"feedkind\":\"primal\",\"enabled\":true,\"description\":\"Latest global notes; be careful!\"}]}",
          "kind": 30078,
          "tags": [
            [
              "d",
              "Primal-Web App"
            ]
          ],
          "created_at": 1732345643,
          "pubkey": "308761407319e2c9faefe341a5cfa17060e25320e7c6bb4e33e3f2fecffb1126",
          "id": "9ded86d4264521b3a827273ca125bfa8a909a5353db922626b1142d3eb7d4003",
          "sig": "71f5e695e514b0e34296b0a4cbac833685c60a4a03e1146580bd7b8bf5381094b8d6f5414b783c53b2e4c8c555692f5b650416450d33b401b2526fe7e7ece4cf"
        }
      }
    ]
  }
]));

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
