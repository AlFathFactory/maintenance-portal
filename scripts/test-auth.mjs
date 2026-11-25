import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { rolldown } from 'rolldown';

const require = createRequire(import.meta.url);
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-tests-'));
let createAuthSession;

before(async () => {
  const bundle = await rolldown({ input: 'src/features/auth/authSession.ts' });
  await bundle.write({ dir: output, format: 'cjs' });
  await bundle.close();
  ({ createAuthSession } = require(path.join(output, 'authSession.js')));
});
after(() => fs.rmSync(output, { recursive: true, force: true }));

const engineer = {
  isAdmin: false,
  hseRole: 'hse_engineer',
  hseInactive: false,
  adminError: null,
  hseError: null,
};
const supervisor = { ...engineer, hseRole: 'hse_supervisor' };
const admin = { ...engineer, isAdmin: true, hseRole: null };
const dual = { ...engineer, isAdmin: true };
const revoked = { ...engineer, hseRole: null, hseInactive: true };
const user = (id) => ({ id, email: `${id}@example.com` });
const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const requests = [];
  const snapshots = [];
  let clears = 0;
  const session = createAuthSession(
    (id) =>
      new Promise((resolve, reject) => {
        requests.push({ id, resolve, reject });
      }),
    () => clears++,
    (snapshot) => snapshots.push(snapshot),
  );
  return {
    session,
    requests,
    snapshots,
    get current() {
      return snapshots.at(-1);
    },
    get clears() {
      return clears;
    },
  };
}

test('tab focus preserves authorized UI and cache while permissions are unchanged', async () => {
  const h = harness();
  h.session.handleSession(user('a'), 'INITIAL_SESSION');
  h.requests[0].resolve(engineer);
  await flush();
  const clears = h.clears;
  h.session.revalidate();
  assert.equal(h.current.authorization.hseRole, 'hse_engineer');
  assert.equal(h.clears, clears);
  h.requests[1].resolve({ ...engineer });
  await flush();
  assert.equal(h.current.authorization.hseRole, 'hse_engineer');
  assert.equal(h.clears, clears);
});

test('token refresh and repeated same-user events keep permissions and cache', async () => {
  const h = harness();
  h.session.handleSession(user('a'), 'SIGNED_IN');
  h.requests[0].resolve(dual);
  await flush();
  const clears = h.clears;
  h.session.handleSession(user('a'), 'TOKEN_REFRESHED');
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.current.authorization, dual);
  h.session.handleSession(user('a'), 'SIGNED_IN');
  h.session.handleSession(user('a'), 'SIGNED_IN');
  assert.equal(h.current.authorization.isAdmin, true);
  assert.equal(h.current.authorization.hseRole, 'hse_engineer');
  assert.equal(h.clears, clears);
  h.requests[1].resolve(revoked);
  await flush();
  assert.deepEqual(h.current.authorization, dual);
  h.requests[2].resolve({ ...dual });
  await flush();
  assert.deepEqual(h.current.authorization, dual);
  assert.equal(h.clears, clears);
});

test('sign-out clears sensitive state and discards an in-flight authorization', async () => {
  const h = harness();
  h.session.handleSession(user('a'), 'SIGNED_IN');
  h.requests[0].resolve(admin);
  await flush();
  h.session.revalidate();
  h.session.handleSession(null, 'SIGNED_OUT');
  assert.equal(h.current.user, null);
  assert.equal(h.current.authorization, null);
  assert.equal(h.clears, 2);
  h.requests[1].resolve(admin);
  await flush();
  assert.equal(h.current.authorization, null);
});

test('account switching clears prior permissions and ignores old account results', async () => {
  const h = harness();
  h.session.handleSession(user('a'), 'SIGNED_IN');
  h.requests[0].resolve(engineer);
  await flush();
  h.session.revalidate();
  h.session.handleSession(user('b'), 'SIGNED_IN');
  assert.equal(h.current.user.id, 'b');
  assert.equal(h.current.authorization, null);
  assert.equal(h.clears, 2);
  h.requests[1].resolve(dual);
  await flush();
  assert.equal(h.current.authorization, null);
  h.requests[2].resolve(supervisor);
  await flush();
  assert.deepEqual(h.current.authorization, supervisor);
});

test('revoked membership removes access and clears privileged cached data', async () => {
  const h = harness();
  h.session.handleSession(user('a'), 'SIGNED_IN');
  h.requests[0].resolve(engineer);
  await flush();
  h.session.revalidate();
  assert.deepEqual(h.current.authorization, engineer);
  h.requests[1].resolve(revoked);
  await flush();
  assert.deepEqual(h.current.authorization, revoked);
  assert.equal(h.clears, 2);
});

test('verification failure denies access and clears privileged cached data', async () => {
  const h = harness();
  h.session.handleSession(user('a'), 'SIGNED_IN');
  h.requests[0].resolve(dual);
  await flush();
  h.session.revalidate();
  h.requests[1].reject(new Error('network unavailable'));
  await flush();
  assert.equal(h.current.authorization.isAdmin, false);
  assert.equal(h.current.authorization.hseRole, null);
  assert.equal(h.current.authorization.adminError, 'network unavailable');
  assert.equal(h.clears, 2);
});

test('Engineer, Supervisor, Admin, and dual memberships remain distinct', async () => {
  for (const expected of [engineer, supervisor, admin, dual]) {
    const h = harness();
    h.session.handleSession(user('a'), 'INITIAL_SESSION');
    h.requests[0].resolve(expected);
    await flush();
    assert.deepEqual(h.current.authorization, expected);
  }
});
