import { test } from "node:test";
import assert from "node:assert/strict";
import { createGetMyProfileTool, type ParryProfileReader } from "./get-my-profile";
import type { ParryContext, ParryProfile } from "../parry.types";

const profile: ParryProfile = {
  playerId: 10,
  name: "Mauricio Bau",
  nickname: "Mauricio",
  clubId: 20,
  clubName: "Club A",
  elo: 1500,
  language: "es",
};

function context(overrides: Partial<ParryContext> = {}): ParryContext {
  return {
    userId: "user-1",
    playerId: 10,
    clubId: 20,
    role: "player",
    language: "es",
    ...overrides,
  };
}

function mockReader(result: ParryProfile | null) {
  const calls: Array<{ userId: string; playerId: number; clubId: number }> = [];
  const reader: ParryProfileReader = {
    getProfile: async (input) => {
      calls.push(input);
      return result;
    },
  };
  return { reader, calls };
}

test("1. returns the profile for a valid authenticated context", async () => {
  const { reader } = mockReader(profile);
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context());

  assert.deepEqual(result, { ok: true, data: profile });
});

test("2. returns NO_PLAYER when the authenticated user has no player", async () => {
  const { reader, calls } = mockReader(profile);
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context({ playerId: null }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "NO_PLAYER");
  assert.equal(calls.length, 0);
});

test("3. returns NO_CLUB when the authenticated user has no club", async () => {
  const { reader, calls } = mockReader(profile);
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context({ clubId: null }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "NO_CLUB");
  assert.equal(calls.length, 0);
});

test("4. returns NOT_FOUND when the reader has no profile", async () => {
  const { reader } = mockReader(null);
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context());

  assert.equal(result.ok, false);
  assert.equal(result.error, "NOT_FOUND");
});

test("5. returns NOT_FOUND when the reader returns another player", async () => {
  const { reader } = mockReader({ ...profile, playerId: 99 });
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context());

  assert.equal(result.ok, false);
  assert.equal(result.error, "NOT_FOUND");
});

test("6. returns NOT_FOUND when the reader returns another club", async () => {
  const { reader } = mockReader({ ...profile, clubId: 99 });
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context());

  assert.equal(result.ok, false);
  assert.equal(result.error, "NOT_FOUND");
});

test("7. passes the trusted user, player and club context to the reader", async () => {
  const { reader, calls } = mockReader(profile);
  const tool = createGetMyProfileTool(reader);

  const result = await tool.execute({}, context());

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      userId: "user-1",
      playerId: 10,
      clubId: 20,
    },
  ]);
});
