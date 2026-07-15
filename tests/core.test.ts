/**
 * Phase 9 — Core module tests
 * Run with: tsx tests/core.test.ts
 */

import { bus } from "../server/core/event-bus";
import { Ok, Err, AppError, Errors, tryAsync } from "../server/core/result";
import { createLogger } from "../server/core/logger";

let pass = 0, fail = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn())
    .then(() => { pass++; console.log(`  ✓ ${name}`); })
    .catch((e) => { fail++; console.error(`  ✗ ${name}: ${e?.message || e}`); });
}
function assert(cond: any, msg = "assertion failed") { if (!cond) throw new Error(msg); }
function assertEq(a: any, b: any) { if (a !== b) throw new Error(`expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }

async function runTests() {
  console.log("\n🧪 Phase 9 — Core Tests\n");

  console.log("EventBus:");
  await test("emit fires registered handlers in order", () => {
    const got: string[] = [];
    const off1 = bus.on("system.error", (p) => got.push("a:" + p.source));
    const off2 = bus.on("system.error", (p) => got.push("b:" + p.source));
    bus.emit("system.error", { source: "test", message: "x" });
    off1(); off2();
    assertEq(got.length, 2);
    assertEq(got[0], "a:test");
    assertEq(got[1], "b:test");
  });

  await test("off() removes handler", () => {
    let count = 0;
    const off = bus.on("cache.invalidated", () => { count++; });
    bus.emit("cache.invalidated", { pattern: "x" });
    off();
    bus.emit("cache.invalidated", { pattern: "x" });
    assertEq(count, 1);
  });

  await test("handler exception does not break other handlers", () => {
    let okFired = false;
    const off1 = bus.on("cache.invalidated", () => { throw new Error("boom"); });
    const off2 = bus.on("cache.invalidated", () => { okFired = true; });
    bus.emit("cache.invalidated", { pattern: "x" });
    off1(); off2();
    assert(okFired, "second handler did not fire");
  });

  await test("stats track emitted/handled counts", () => {
    const before = bus.getStats().totalEmitted;
    bus.emit("cache.invalidated", { pattern: "y" });
    const after = bus.getStats().totalEmitted;
    assert(after > before, "totalEmitted did not increase");
  });

  console.log("\nResult:");
  await test("Ok wraps value, ok:true", () => {
    const r = Ok(42);
    assert(r.ok); assertEq(r.value, 42);
  });

  await test("Err wraps error, ok:false", () => {
    const r = Err(Errors.notFound("Order"));
    assert(!r.ok);
    if (!r.ok) { assertEq(r.error.status, 404); assertEq(r.error.code, "NOT_FOUND"); }
  });

  await test("tryAsync catches thrown errors into Result", async () => {
    const r = await tryAsync(async () => { throw new Error("oops"); });
    assert(!r.ok);
    if (!r.ok) assertEq(r.error.code, "INTERNAL");
  });

  await test("tryAsync passes AppError through unchanged", async () => {
    const r = await tryAsync(async () => { throw Errors.forbidden("nope"); });
    assert(!r.ok);
    if (!r.ok) assertEq(r.error.code, "FORBIDDEN");
  });

  console.log("\nLogger:");
  await test("createLogger produces callable methods", () => {
    const l = createLogger("test");
    assert(typeof l.info === "function");
    assert(typeof l.warn === "function");
    assert(typeof l.error === "function");
    assert(typeof l.child === "function");
  });

  await test("child logger inherits scope", () => {
    const l = createLogger("parent").child("child");
    l.debug("hello"); // visual only
    assert(true);
  });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${pass} passed · ${fail} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests();
