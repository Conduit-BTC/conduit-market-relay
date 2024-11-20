import { assertEquals } from "@std/assert";

Deno.test(function helloTest() {
  const x = 1 + 2;
  assertEquals(x, 3);
});
