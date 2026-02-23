import { describe, it, expect } from "vitest";
import { FakeTransactionalEmail } from "./fake-transactional-email";
import type { TransactionalEmailMessage } from "../transactional-email";

describe("FakeTransactionalEmail", () => {
  it("records sent messages", async () => {
    const fake = new FakeTransactionalEmail();
    const msg: TransactionalEmailMessage = {
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    };

    await fake.send(msg);
    expect(fake.sentMessages).toHaveLength(1);
    expect(fake.sentMessages[0]).toEqual(msg);
  });

  it("returns configured result", async () => {
    const fake = new FakeTransactionalEmail();
    fake.nextResult = { ok: false, error: "service down" };

    const result = await fake.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    expect(result).toEqual({ ok: false, error: "service down" });
  });

  it("returns ok by default", async () => {
    const fake = new FakeTransactionalEmail();
    const result = await fake.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    expect(result).toEqual({ ok: true, messageId: "fake-msg-001" });
  });

  it("reset clears history and restores default result", async () => {
    const fake = new FakeTransactionalEmail();
    fake.nextResult = { ok: false, error: "fail" };

    await fake.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    fake.reset();
    expect(fake.sentMessages).toHaveLength(0);
    expect(fake.nextResult).toEqual({ ok: true, messageId: "fake-msg-001" });
  });

  it("accumulates multiple messages", async () => {
    const fake = new FakeTransactionalEmail();

    await fake.send({
      to: "a@test.com",
      subject: "First",
      textBody: "1",
      htmlBody: "<p>1</p>",
    });
    await fake.send({
      to: "b@test.com",
      subject: "Second",
      textBody: "2",
      htmlBody: "<p>2</p>",
    });

    expect(fake.sentMessages).toHaveLength(2);
    expect(fake.sentMessages[0].to).toBe("a@test.com");
    expect(fake.sentMessages[1].to).toBe("b@test.com");
  });
});
