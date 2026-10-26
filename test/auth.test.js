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

  for (const route of ["/api/admin/listings", "/api/admin/questions", "/api/admin/categories", "/api/admin/users"]) {
    const response = await request(route);
    assert.equal(response.status, 401);
  }

  const userApi = await request("/api/user/session");
  assert.equal(userApi.status, 401);
  const userPage = await request("/dashboard", { redirect: "manual" });
  assert.equal(userPage.status, 302);
  assert.equal(userPage.headers.get("location"), "/user-login.html");
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
  assert.match(await page.text(), /id="logoutBtn"/);
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

test("job seekers can register and access only their own profile and matching-drive API", async () => {
  const originalExecute = pool.execute;
  const insertedValues = [];
  const userPasswordHash = bcrypt.hashSync("a-strong-user-password", 12);
  pool.execute = async (sql, values = []) => {
    if (/INSERT INTO users/i.test(sql)) {
      insertedValues.push(values);
      return [{ insertId: 17 }, []];
    }
    if (/SELECT id, password_hash FROM users/i.test(sql)) {
      assert.deepEqual(values, ["applicant@example.com"]);
      return [[{ id: 17, password_hash: userPasswordHash }], []];
    }
    if (/SELECT id, full_name, email/i.test(sql)) {
      assert.deepEqual(values, ["17"]);
      return [[{
        id: 17,
        full_name: "Test Applicant",
        email: "applicant@example.com",
        phone: "+91 99999 11111",
        education: "B.E. Computer Science",
        graduation_year: 2026,
        skills: '["Java","SQL"]',
        experience: "Fresher",
        preferred_location: "Chennai",
        created_at: "2026-10-26 00:00:00"
      }], []];
    }
    if (/FROM interviews i LEFT JOIN categories/i.test(sql)) {
      assert.match(sql, /interview_date >= CURDATE\(\)/);
      return [[{
        id: "job-1",
        company: "Example",
        role: "Engineer",
        interview_type: "online",
        interview_date: "2026-11-01",
        location: "Chennai",
        experience: "Fresher",
        salary: "",
        apply_link: "",
        description: "Java and SQL role",
        skills: ["Java", "SQL"],
        category_id: null,
        created_at: "2026-10-26 00:00:00",
        updated_at: "2026-10-26 00:00:00"
      }], []];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };

  try {
    const registration = await request("/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({
        fullName: "Test Applicant",
        email: "Applicant@Example.com",
        phone: "+91 99999 11111",
        education: "B.E. Computer Science",
        graduationYear: "2026",
        skills: ["Java", "SQL"],
        experience: "Fresher",
        preferredLocation: "Chennai",
        password: "a-strong-user-password"
      })
    });
    assert.equal(registration.status, 201);
    assert.equal(insertedValues.length, 1);
    assert.equal(insertedValues[0][1], "applicant@example.com");
    assert.match(registration.headers.get("set-cookie"), /HttpOnly/i);
    const cookieHeader = registration.headers.get("set-cookie").split(";")[0];

    const session = await request("/api/user/session", { headers: { cookie: cookieHeader } });
    assert.equal(session.status, 200);
    const sessionBody = await session.json();
    assert.equal(sessionBody.user.fullName, "Test Applicant");
    assert.deepEqual(sessionBody.user.skills, ["Java", "SQL"]);
    assert.equal(JSON.stringify(sessionBody).includes("password_hash"), false);

    const dashboard = await request("/api/user/dashboard", { headers: { cookie: cookieHeader } });
    assert.equal(dashboard.status, 200);
    assert.equal((await dashboard.json()).listings[0].role, "Engineer");

    const userLogin = await request("/api/user/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email: "APPLICANT@example.com", password: "a-strong-user-password" })
    });
    assert.equal(userLogin.status, 200);
    assert.match(userLogin.headers.get("set-cookie"), /HttpOnly/i);
  } finally {
    pool.execute = originalExecute;
  }
});

test("user registration validates profiles before database access and reports duplicate email", async () => {
  const originalExecute = pool.execute;
  let called = false;
  pool.execute = async () => {
    called = true;
    const error = new Error("duplicate email");
    error.code = "ER_DUP_ENTRY";
    throw error;
  };

  try {
    const invalid = await request("/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ fullName: "", email: "not-an-email", password: "short" })
    });
    assert.equal(invalid.status, 400);
    assert.equal(called, false);

    const duplicate = await request("/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({
        fullName: "Applicant",
        email: "applicant@example.com",
        password: "a-strong-user-password"
      })
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: "An account with this email already exists." });
  } finally {
    pool.execute = originalExecute;
  }
});

test("logout expires the JWT cookie", async () => {
  const response = await request("/api/admin/logout", {
    method: "POST",
    headers: { origin: baseUrl }
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get("set-cookie") || "", /Expires=Thu, 01 Jan 1970/i);
});
