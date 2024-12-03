import { isValidJsonString } from "@/utils/typeUtils.ts";

export class NostrService {
  static validateMessage(data: unknown, maxMessageSize: number): { success: boolean, message: string } {
    // False if value is NOT a JSON Array string, with the first element being a string

    if (typeof data !== "string") return { success: false, message: 'Invalid message type: Not a string' }
    if (typeof data === "string" && data.length > maxMessageSize) return { success: false, message: 'Invalid message size: Exceeds maximum allowed size' }

    if (!isValidJsonString(data)) return { success: false, message: 'Invalid message format: Not a valid JSON string' }
    if (data.slice(0, 1) !== '[' || data.slice(-1) !== ']') return { success: false, message: 'Invalid message format: Not a JSON Array' }

    const message: Array<unknown> = JSON.parse(data);

    if (message.length < 1) return { success: false, message: 'Invalid message format: Not a JSON Array with at least one element' }
    if (typeof message[0] !== "string") return { success: false, message: 'Invalid message format' }

    return { success: true, message: data };
  }

  static route(ws: WebSocket, data: string): void {
    const message: { 0: string, [n: number]: unknown } = JSON.parse(data);
    const type: string = message[0];

    switch (type) {
      case "EVENT":
        console.log("Event received");
        break;
      case "REQ":
        console.log("Request received");
        break;
      case "CLOSE":
        console.log("Close received");
        break;
      default:
        throw new Error("Not a Nostr message");
    }
  }
}
