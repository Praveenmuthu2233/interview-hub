"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const bcrypt = require("bcrypt");

const adminPassword = "test-password-for-auth-tests";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "a-test-only-random-jwt-secret-at-least-32-bytes";
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(adminPassword, 12);
process.env.DB_NAME = "test_interviewedge";
process.env.DB_USER = "test_user";
process.env.DB_PASSWORD = "test_password";
process.env.PUBLIC_ORIGINS = "";

const app = require("../server");
const pool = require("../database");
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function login() {
  return request("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ username: "test-admin", password: adminPassword })
  });
}

test("admin page and API routes reject requests without a JWT", async () => {
  const page = await request("/admin.html", { redirect: "manual" });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get("location"), "/admin-login.html");

  for (const route of ["/api/admin/listings", "/api/admin/questions", "/api/admin/categories"]) {
    const response = await request(route);
    assert.equal(response.status, 401);
  }
});

test("server configuration and source files are not served as static assets", async () => {
  for (const file of ["/package.json", "/package-lock.json", "/server.js", "/database.js", "/.env.example"]) {
    const response = await request(file);
    assert.equal(response.status, 404, `${file} should not be publicly served`);
  }
});

test("login rejects incorrect credentials and enforces same-origin requests", async () => {
  const invalid = await request("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ username: "test-admin", password: "incorrect" })
  });
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), { error: "Invalid admin ID or password." });

  const crossOrigin = await request("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.invalid" },
    body: JSON.stringify({ username: "test-admin", password: adminPassword })
  });
  assert.equal(crossOrigin.status, 403);
});

test("valid login creates an HttpOnly JWT session and unlocks the admin page", async () => {
  const response = await login();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true });

  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.doesNotMatch(cookie, /Secure/i);
  const cookieHeader = cookie.split(";")[0];

  const session = await request("/api/admin/session", { headers: { cookie: cookieHeader } });
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { authenticated: true, username: "test-admin" });

  const page = await request("/admin.html", { headers: { cookie: cookieHeader } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /JWT session/);
});

test("admin listings are read from interviews without requiring categories", async () => {
  const response = await login();
  const cookieHeader = response.headers.get("set-cookie").split(";")[0];
  const originalExecute = pool.execute;
  let query;
  pool.execute = async sql => {
    query = sql;
    return [[{
      id: "listing-1",
      company: "Example",
      role: "Engineer",
      interview_type: "online",
      interview_date: "2026-10-25",
      location: "Remote",
      experience: "",
      salary: "",
      apply_link: "",
      description: "Interview details",
      skills: [],
      category_id: null,
      created_at: "2026-10-25 00:00:00",
      updated_at: "2026-10-25 00:00:00"
    }], []];
  };

  try {
    const listingsResponse = await request("/api/admin/listings", {
      headers: { cookie: cookieHeader }
    });
    assert.equal(listingsResponse.status, 200);
    assert.match(query, /FROM interviews i/i);
    assert.doesNotMatch(query, /JOIN categories/i);
    assert.deepEqual((await listingsResponse.json()).listings[0], {
      id: "listing-1",
      company: "Example",
      role: "Engineer",
      type: "online",
      date: "2026-10-25",
      location: "Remote",
      experience: "",
      salary: "",
      applyLink: "",
      description: "Interview details",
      skills: [],
      categoryId: null,
      categoryName: null,
      createdAt: "2026-10-25 00:00:00",
      updatedAt: "2026-10-25 00:00:00"
    });
  } finally {
    pool.execute = originalExecute;
  }
});

test("admin APIs validate invalid inputs before database access", async () => {
  const response = await login();
  const cookieHeader = response.headers.get("set-cookie").split(";")[0];

  const invalidListing = await request("/api/admin/listings", {
    method: "POST",
    headers: { cookie: cookieHeader, "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ company: "" })
  });
  assert.equal(invalidListing.status, 400);

  const invalidQuestion = await request("/api/admin/questions", {
    method: "POST",
    headers: { cookie: cookieHeader, "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ question: "Question without required fields" })
  });
  assert.equal(invalidQuestion.status, 400);
});

test("logout expires the JWT cookie", async () => {
  const response = await request("/api/admin/logout", {
    method: "POST",
    headers: { origin: baseUrl }
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get("set-cookie") || "", /Expires=Thu, 01 Jan 1970/i);
});
