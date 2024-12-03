import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { NostrService } from "@/services/nostrService.ts";

Deno.test("NostrService.validateMessage", async (t) => {
  const maxMessageSize = 1000; // Example max size

  await t.step("validates correct message format", () => {
    const validMessage = JSON.stringify(["EVENT", { some: "data" }]);
    const result = NostrService.validateMessage(validMessage, maxMessageSize);
    assertEquals(result.success, true);
    assertEquals(result.message, validMessage);
  });

  await t.step("rejects non-string input", () => {
    const result = NostrService.validateMessage(123 as unknown as string, maxMessageSize);
    assertEquals(result.success, false);
    assertEquals(result.message, "Invalid message type: Not a string");
  });

  await t.step("rejects oversized messages", () => {
    const largeMessage = JSON.stringify(["EVENT", "x".repeat(maxMessageSize)]);
    const result = NostrService.validateMessage(largeMessage, maxMessageSize);
    assertEquals(result.success, false);
    assertEquals(result.message, "Invalid message size: Exceeds maximum allowed size");
  });

  await t.step("rejects invalid JSON string", () => {
    const invalidJson = '["EVENT", { invalid json }';
    const result = NostrService.validateMessage(invalidJson, maxMessageSize);
    assertEquals(result.success, false);
    assertEquals(result.message, "Invalid message format: Not a valid JSON string");
  });

  await t.step("rejects empty array", () => {
    const emptyArray = JSON.stringify([]);
    const result = NostrService.validateMessage(emptyArray, maxMessageSize);
    assertEquals(result.success, false);
    assertEquals(result.message, "Invalid message format: Not a JSON Array with at least one element");
  });

  await t.step("rejects array with non-string first element", () => {
    const invalidFirstElement = JSON.stringify([123, "data"]);
    const result = NostrService.validateMessage(invalidFirstElement, maxMessageSize);
    assertEquals(result.success, false);
    assertEquals(result.message, "Invalid message format");
  });

  await t.step("rejects non-array JSON string", () => {
    const nonArrayJson = JSON.stringify({ some: "data" });
    const result = NostrService.validateMessage(nonArrayJson, maxMessageSize);
    assertEquals(result.success, false);
    assertEquals(result.message, "Invalid message format: Not a JSON Array");
  });

  await t.step("accepts minimal valid message", () => {
    const minimalMessage = JSON.stringify(["EVENT"]);
    const result = NostrService.validateMessage(minimalMessage, maxMessageSize);
    assertEquals(result.success, true);
    assertEquals(result.message, minimalMessage);
  });
});
