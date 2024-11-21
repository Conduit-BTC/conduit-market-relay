import { assertArrayIncludes, assertEquals, assertExists, assertFalse, assertThrows, assert } from "@std/assert";
import { eventBus } from "../../src/events/eventBus.ts"

const TEST_EVENT = "TEST_EVENT"
const TEST_EVENT_X = "TEST_EVENT_X"

const handleTestEvent = () => {}
const handleSecondTestEvent = Object.create(handleTestEvent)
const handleThirdTestEvent = Object.create(handleTestEvent)

function runSubscriptionChecks(eventName: string, getEventNamesExpectedValue: number, getListenenerCountExpectedValue: number, eventNamesArray: string[]): void {
  assert(eventBus.hasListeners(eventName))
  assertEquals(eventBus.getEventNames().length, getEventNamesExpectedValue)
  assertEquals(eventBus.getListenerCount(eventName), getListenenerCountExpectedValue)
  assertArrayIncludes(eventBus.getEventNames(), eventNamesArray)
}

Deno.test(function eventBus_isSingleton() {
  // @ts-expect-error - EventBus is a read-only singleton class
  assertThrows(() => new eventBus());
  assertExists(eventBus);
});

Deno.test(function eventBus_queryMethods() {
  const TEST_EVENT = "TEST_EVENT"
  assertEquals(eventBus.getListenerCount(TEST_EVENT), 0)
  assertFalse(eventBus.hasListeners(TEST_EVENT))
  assertEquals(eventBus.getEventNames().length, 0)
  assertThrows(() => assertArrayIncludes(eventBus.getEventNames(), [TEST_EVENT]))
})


Deno.test(function eventBus_commandMethods_emit() {
  let eventArgs: any[] = []

  const handleEvent = (...args: any[]) => {
    eventArgs = args
  }

  eventBus.subscribe(TEST_EVENT, handleEvent)

  eventBus.emit(TEST_EVENT, ["Hello world!"])

  assert(eventArgs.length === 1)
  assert(eventArgs[0][0] === "Hello world!")

  eventBus.removeAllListeners(TEST_EVENT)
})

Deno.test(function eventBus_commandMethods_subscribe_and_unsubscribe() {
  const unsubFirstTest = eventBus.subscribe(TEST_EVENT, handleTestEvent)
  runSubscriptionChecks(TEST_EVENT, 1, 1, [TEST_EVENT])

  const unsubSecondTest = eventBus.subscribe(TEST_EVENT, handleSecondTestEvent)
  runSubscriptionChecks(TEST_EVENT, 1, 2, [TEST_EVENT])

  const unsubThirdTest = eventBus.subscribe(TEST_EVENT_X, handleThirdTestEvent)
  runSubscriptionChecks(TEST_EVENT_X, 2, 1, [TEST_EVENT, TEST_EVENT_X])

  unsubFirstTest()
  runSubscriptionChecks(TEST_EVENT, 2, 1, [TEST_EVENT, TEST_EVENT_X])

  unsubSecondTest()
  runSubscriptionChecks(TEST_EVENT_X, 1, 1, [TEST_EVENT_X])

  unsubThirdTest()
  assertFalse(eventBus.hasListeners(TEST_EVENT_X))
  assertEquals(eventBus.getEventNames().length, 0)
  assertEquals(eventBus.getListenerCount(TEST_EVENT_X), 0)
})

Deno.test(function eventBus_commandMethods_subscribeOnce() {
  eventBus.subscribeOnce(TEST_EVENT, handleTestEvent)
  eventBus.emit(TEST_EVENT)

  assertEquals(eventBus.getEventNames().length, 0)
})

Deno.test(function eventBus_commandMethods_removeAllListeners() {
  eventBus.subscribe(TEST_EVENT, handleTestEvent)
  eventBus.subscribe(TEST_EVENT, handleSecondTestEvent)
  eventBus.subscribe(TEST_EVENT, handleThirdTestEvent)

  runSubscriptionChecks(TEST_EVENT, 1, 3, [TEST_EVENT])

  eventBus.removeAllListeners(TEST_EVENT);
  assertEquals(eventBus.getEventNames().length, 0)
})
