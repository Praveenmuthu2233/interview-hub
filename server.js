"use strict";

require("dotenv").config();

const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const crypto = require("node:crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const path = require("node:path");
const pool = require("./database");
const mysql = require("mysql2/promise");

module.exports = pool;

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === "production";
const ADMIN_USERNAME = requiredEnvironment("ADMIN_USERNAME");
const ADMIN_PASSWORD_HASH = requiredEnvironment("ADMIN_PASSWORD_HASH");
const JWT_SECRET = requiredEnvironment("JWT_SECRET");
const PUBLIC_ORIGINS = (process.env.PUBLIC_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);
const JWT_TTL_SECONDS = 60 * 60;
const COOKIE_NAME = "interviewedge_admin";
const JWT_ISSUER = "interviewedge";
const JWT_AUDIENCE = "interviewedge-admin";
const ROOT = __dirname;
const BLOCKED_STATIC_PATHS = new Set([
  ".env",
  "env.example",
  "server.js",
  "database.js",
  "package.json",
  "package-lock.json",
  "firebase.json",
  "firestore.rules"
]);

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

if (Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET must contain at least 32 bytes of random data.");
}
// if (!/^\$2[aby]\$\d{2}\$/.test(ADMIN_PASSWORD_HASH) || bcrypt.getRounds(ADMIN_PASSWORD_HASH) < 12) {
//   throw new Error("ADMIN_PASSWORD_HASH must be a bcrypt hash with a cost factor of at least 12.");
// }
if (
    typeof ADMIN_PASSWORD_HASH !== "string" ||
    !/^\$2[aby]\$\d{2}\$/.test(ADMIN_PASSWORD_HASH) ||
    bcrypt.getRounds(ADMIN_PASSWORD_HASH) < 12
) {
    throw new Error(
        "ADMIN_PASSWORD_HASH must be a valid bcrypt hash with a cost factor of at least 12."
    );
}
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());
app.use((request, response, next) => {
  response.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Cache-Control": "no-store"
  });
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." }
});

function safeEqual(first, second) {
  const firstHash = crypto.createHash("sha256").update(String(first)).digest();
  const secondHash = crypto.createHash("sha256").update(String(second)).digest();
  return crypto.timingSafeEqual(firstHash, secondHash);
}

function checkSameOrigin(request, response, next) {
  const origin = request.get("origin");
  if (!origin) {
    response.status(403).json({ error: "A same-origin request is required." });
    return;
  }
  try {
    const originUrl = new URL(origin);
    const isSameHost = originUrl.host === request.get("host");
    const isAllowedOrigin = PUBLIC_ORIGINS.some(value => {
      try {
        return new URL(value).origin === originUrl.origin;
      } catch {
        return false;
      }
    });
    const allowed = isSameHost || isAllowedOrigin;
    if (!allowed) {
      response.status(403).json({ error: "Cross-origin request rejected." });
      return;
    }
  } catch {
    response.status(403).json({ error: "Invalid request origin." });
    return;
  }
  next();
}

function requireAdmin(request, response, next) {
  const token = request.cookies[COOKIE_NAME];
  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    if (!payload.sub || payload.role !== "admin") {
      response.status(401).json({ error: "Authentication required." });
      return;
    }
    request.admin = { username: payload.sub };
    next();
  } catch {
    response.clearCookie(COOKIE_NAME, cookieOptions());
    response.status(401).json({ error: "Your admin session is invalid or has expired." });
  }
}

function requireAdminPage(request, response, next) {
  const token = request.cookies[COOKIE_NAME];
  try {
    if (!token) throw new Error("Missing token");
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    if (!payload.sub || payload.role !== "admin") throw new Error("Invalid subject");
    next();
  } catch {
    response.clearCookie(COOKIE_NAME, cookieOptions());
    response.redirect(302, "/admin-login.html");
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/"
  };
}

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cleanUrl(value) {
  const urlText = text(value, 2048);
  if (!urlText) return "";
  try {
    const url = new URL(urlText);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function sanitizeListing(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A listing object is required." };
  }
  const type = ["online", "offline", "walkin"].includes(body.type) ? body.type : "";
  const listing = {
    company: text(body.company, 160),
    role: text(body.role, 160),
    type,
    date: typeof body.date === "string" ? body.date : "",
    location: text(body.location, 240),
    experience: text(body.experience, 120),
    salary: text(body.salary, 120),
    applyLink: text(body.applyLink, 2048),
    description: text(body.description, 12000),
    skills: Array.isArray(body.skills)
      ? [...new Set(body.skills.filter(skill => typeof skill === "string").map(skill => text(skill, 80)).filter(Boolean))].slice(0, 30)
      : [],
    categoryId: body.categoryId === null || body.categoryId === undefined || body.categoryId === "" ? null : positiveId(body.categoryId)
  };
  if (!listing.company || !listing.role || !listing.description || !validDate(listing.date)) {
    return { error: "Company, role, a valid date, and description are required." };
  }
  if (!listing.type) return { error: "Interview type must be online, offline, or walkin." };
  if (listing.applyLink && !cleanUrl(listing.applyLink)) return { error: "Apply link must be a valid HTTP or HTTPS URL." };
  if (body.skills !== undefined && !Array.isArray(body.skills)) return { error: "Skills must be a list of text values." };
  if (
    body.categoryId !== null
    && body.categoryId !== undefined
    && body.categoryId !== ""
    && listing.categoryId === null
  ) {
    return { error: "Category ID must be a positive integer." };
  }
  listing.applyLink = cleanUrl(listing.applyLink);
  return { listing };
}

function sanitizeCategory(body, categoryType) {
  const name = text(body && body.name, 120);
  if (!name) return { error: "Category name is required." };
  const slug = name.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
  if (!slug) return { error: "Category name must contain letters or numbers." };
  return { category: { name, slug, categoryType } };
}

function sanitizeQuestion(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A question object is required." };
  }
  const categoryId = positiveId(body.categoryId);
  const difficulty = ["beginner", "intermediate", "advanced"].includes(body.difficulty) ? body.difficulty : "";
  if (!categoryId) return { error: "A valid question category is required." };
  if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 12000) {
    return { error: "Question is required and must be at most 12000 characters." };
  }
  if (typeof body.answer !== "string" || !body.answer.trim() || body.answer.length > 50000) {
    return { error: "Answer is required and must be at most 50000 characters." };
  }
  if (!difficulty) return { error: "Difficulty must be beginner, intermediate, or advanced." };
  if (body.isPublished !== undefined && typeof body.isPublished !== "boolean") {
    return { error: "isPublished must be a boolean." };
  }
  return {
    question: {
      categoryId,
      question: body.question.trim(),
      answer: body.answer.trim(),
      difficulty,
      isPublished: body.isPublished !== false
    }
  };
}

async function hasCategory(categoryId, categoryType) {
  if (categoryId === null || categoryId === undefined) return categoryType === "listing";
  const [rows] = await pool.execute(
    "SELECT id FROM categories WHERE id = ? AND category_type = ? LIMIT 1",
    [categoryId, categoryType]
  );
  return rows.length > 0;
}

function mapListing(row) {
  let skills = row.skills;
  if (typeof skills === "string") {
    try {
      skills = JSON.parse(skills);
    } catch {
      skills = [];
    }
  }
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    type: row.interview_type,
    date: row.interview_date,
    location: row.location,
    experience: row.experience,
    salary: row.salary,
    applyLink: row.apply_link,
    description: row.description,
    skills: Array.isArray(skills) ? skills : [],
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapQuestion(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    category: row.category_name,
    question: row.question,
    answer: row.answer,
    difficulty: row.difficulty,
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const LISTING_SELECT = `SELECT i.id, i.company, i.role, i.interview_type, DATE_FORMAT(i.interview_date, '%Y-%m-%d') AS interview_date,
  i.location, i.experience, i.salary, i.apply_link, i.description, i.skills, i.category_id, c.name AS category_name,
  i.created_at, i.updated_at
  FROM interviews i LEFT JOIN categories c ON c.id = i.category_id`;
const QUESTION_SELECT = `SELECT q.id, q.category_id, q.question, q.answer, q.difficulty, q.is_published,
  q.created_at, q.updated_at, c.name AS category_name
  FROM questions q JOIN categories c ON c.id = q.category_id`;

app.post("/api/admin/login", checkSameOrigin, loginLimiter, async (request, response, next) => {
  const { username, password } = request.body || {};
  if (typeof username !== "string" || typeof password !== "string" || password.length > 1024) {
    response.status(400).json({ error: "Admin ID and password are required." });
    return;
  }
  try {
    let matched = false;
    let authUser = username;

    try {
      const [dbRows] = await pool.execute(
        "SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1",
        [username]
      );
      if (dbRows.length > 0) {
        matched = await bcrypt.compare(password, dbRows[0].password_hash);
        if (matched) authUser = dbRows[0].username;
      }
    } catch (dbErr) {
      console.warn("Database admin check error, falling back to env:", dbErr.message);
    }

    if (!matched) {
      const [passwordMatches, usernameMatches] = await Promise.all([
        bcrypt.compare(password, ADMIN_PASSWORD_HASH),
        Promise.resolve(safeEqual(username, ADMIN_USERNAME))
      ]);
      if (passwordMatches && usernameMatches) {
        matched = true;
        authUser = ADMIN_USERNAME;
      }
    }

    if (!matched) {
      response.status(401).json({ error: "Invalid admin ID or password." });
      return;
    }
    const token = jwt.sign({ sub: authUser, role: "admin" }, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: JWT_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    response.cookie(COOKIE_NAME, token, {
      ...cookieOptions(),
      maxAge: JWT_TTL_SECONDS * 1000
    });
    response.json({ authenticated: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/logout", checkSameOrigin, (request, response) => {
  response.clearCookie(COOKIE_NAME, cookieOptions());
  response.status(204).end();
});

app.get("/api/admin/session", requireAdmin, (request, response) => {
  response.json({ authenticated: true, username: request.admin.username });
});

app.get("/api/listings", async (request, response, next) => {
  try {
    const [rows] = await pool.execute(`${LISTING_SELECT} ORDER BY i.created_at DESC`);
    response.json({ listings: rows.map(mapListing) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/listings/:id", async (request, response, next) => {
  try {
    const [rows] = await pool.execute(`${LISTING_SELECT} WHERE i.id = ? LIMIT 1`, [request.params.id]);
    if (!rows.length) {
      response.status(404).json({ error: "Listing not found." });
      return;
    }
    response.json({ listing: mapListing(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/listings/:id/related", async (request, response, next) => {
  try {
    const [rows] = await pool.execute(
      `${LISTING_SELECT} WHERE i.id <> ? ORDER BY i.interview_date DESC LIMIT 6`,
      [request.params.id]
    );
    response.json({ listings: rows.map(mapListing) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (request, response, next) => {
  const categoryType = request.query.type === "question" ? "question" : "listing";
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, slug, category_type AS type FROM categories WHERE category_type = ? ORDER BY name",
      [categoryType]
    );
    response.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/questions", async (request, response, next) => {
  const categoryId = request.query.categoryId ? positiveId(request.query.categoryId) : null;
  if (request.query.categoryId && !categoryId) {
    response.status(400).json({ error: "Category ID must be a positive integer." });
    return;
  }
  const page = Math.max(1, Math.min(10000, Number.parseInt(request.query.page, 10) || 1));
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(request.query.pageSize, 10) || 20));
  const where = ["q.is_published = TRUE"];
  const values = [];
  if (categoryId) {
    where.push("q.category_id = ?");
    values.push(categoryId);
  }
  try {
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM questions q WHERE ${where.join(" AND ")}`,
      values
    );
    const [rows] = await pool.execute(
      `${QUESTION_SELECT} WHERE ${where.join(" AND ")} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, (page - 1) * pageSize]
    );
    response.json({ questions: rows.map(mapQuestion), total: Number(countRows[0].total), page, pageSize });
  } catch (error) {
    next(error);
  }
});

app.get("/api/questions/:id", async (request, response, next) => {
  try {
    const [rows] = await pool.execute(
      `${QUESTION_SELECT} WHERE q.id = ? AND q.is_published = TRUE LIMIT 1`,
      [request.params.id]
    );
    if (!rows.length) {
      response.status(404).json({ error: "Question not found." });
      return;
    }
    response.json({ question: mapQuestion(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/listings", requireAdmin, async (request, response, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.id, i.company, i.role, i.interview_type, DATE_FORMAT(i.interview_date, '%Y-%m-%d') AS interview_date,
        i.location, i.experience, i.salary, i.apply_link, i.description, i.skills, i.category_id,
        i.created_at, i.updated_at
       FROM interviews i
       ORDER BY i.interview_date DESC, i.created_at DESC`
    );
    response.json({ listings: rows.map(mapListing) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/listings", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const result = sanitizeListing(request.body);
  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }
  try {
    const id = crypto.randomUUID();
    const listing = result.listing;
    if (listing.categoryId && !await hasCategory(listing.categoryId, "listing")) {
      response.status(400).json({ error: "The selected listing category does not exist." });
      return;
    }
    await pool.execute(
      `INSERT INTO interviews
        (id, company, role, interview_type, interview_date, location, experience, salary, apply_link, description, skills, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, listing.company, listing.role, listing.type, listing.date, listing.location, listing.experience, listing.salary,
        listing.applyLink, listing.description, JSON.stringify(listing.skills), listing.categoryId]
    );
    response.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/listings/:id", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const result = sanitizeListing(request.body);
  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }
  try {
    const listing = result.listing;
    if (listing.categoryId && !await hasCategory(listing.categoryId, "listing")) {
      response.status(400).json({ error: "The selected listing category does not exist." });
      return;
    }
    const [resultSet] = await pool.execute(
      `UPDATE interviews SET company = ?, role = ?, interview_type = ?, interview_date = ?, location = ?,
       experience = ?, salary = ?, apply_link = ?, description = ?, skills = ?, category_id = ? WHERE id = ?`,
      [listing.company, listing.role, listing.type, listing.date, listing.location, listing.experience, listing.salary,
        listing.applyLink, listing.description, JSON.stringify(listing.skills), listing.categoryId, request.params.id]
    );
    if (!resultSet.affectedRows) {
      const [rows] = await pool.execute("SELECT id FROM interviews WHERE id = ? LIMIT 1", [request.params.id]);
      if (!rows.length) {
        response.status(404).json({ error: "Listing not found." });
        return;
      }
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/listings/:id", checkSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const [result] = await pool.execute("DELETE FROM interviews WHERE id = ?", [request.params.id]);
    if (!result.affectedRows) {
      response.status(404).json({ error: "Listing not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/questions", requireAdmin, async (request, response, next) => {
  try {
    const [rows] = await pool.execute(`${QUESTION_SELECT} ORDER BY q.created_at DESC`);
    response.json({ questions: rows.map(mapQuestion) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/questions", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const result = sanitizeQuestion(request.body);
  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }
  try {
    const id = crypto.randomUUID();
    const question = result.question;
    if (!await hasCategory(question.categoryId, "question")) {
      response.status(400).json({ error: "The selected question category does not exist." });
      return;
    }
    await pool.execute(
      "INSERT INTO questions (id, category_id, question, answer, difficulty, is_published) VALUES (?, ?, ?, ?, ?, ?)",
      [id, question.categoryId, question.question, question.answer, question.difficulty, question.isPublished]
    );
    response.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/questions/:id", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const result = sanitizeQuestion(request.body);
  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }
  try {
    const question = result.question;
    if (!await hasCategory(question.categoryId, "question")) {
      response.status(400).json({ error: "The selected question category does not exist." });
      return;
    }
    const [resultSet] = await pool.execute(
      `UPDATE questions SET category_id = ?, question = ?, answer = ?, difficulty = ?, is_published = ? WHERE id = ?`,
      [question.categoryId, question.question, question.answer, question.difficulty, question.isPublished, request.params.id]
    );
    if (!resultSet.affectedRows) {
      const [rows] = await pool.execute("SELECT id FROM questions WHERE id = ? LIMIT 1", [request.params.id]);
      if (!rows.length) {
        response.status(404).json({ error: "Question not found." });
        return;
      }
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/questions/:id", checkSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const [result] = await pool.execute("DELETE FROM questions WHERE id = ?", [request.params.id]);
    if (!result.affectedRows) {
      response.status(404).json({ error: "Question not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/categories", requireAdmin, async (request, response, next) => {
  try {
    const [rows] = await pool.execute("SELECT id, name, slug, category_type AS type FROM categories ORDER BY category_type, name");
    response.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

app.get("/healthz", async (request, response) => {
  try {
    await pool.execute("SELECT 1");
    response.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Health check database probe failed:", error);
    response.status(503).json({ status: "unavailable" });
  }
});

app.post("/api/admin/categories", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const categoryType = request.body && request.body.type;
  if (!["listing", "question"].includes(categoryType)) {
    response.status(400).json({ error: "Category type must be listing or question." });
    return;
  }
  const result = sanitizeCategory(request.body, categoryType);
  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }
  try {
    const [insertResult] = await pool.execute(
      "INSERT INTO categories (name, slug, category_type) VALUES (?, ?, ?)",
      [result.category.name, result.category.slug, result.category.categoryType]
    );
    response.status(201).json({ id: insertResult.insertId, ...result.category });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      response.status(409).json({ error: "A category with that name already exists." });
      return;
    }
    next(error);
  }
});

app.put("/api/admin/categories/:id", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const id = positiveId(request.params.id);
  const categoryType = request.body && request.body.type;
  if (!id || !["listing", "question"].includes(categoryType)) {
    response.status(400).json({ error: "A valid category ID and type are required." });
    return;
  }
  const result = sanitizeCategory(request.body, categoryType);
  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }
  try {
    const [updateResult] = await pool.execute(
      "UPDATE categories SET name = ?, slug = ? WHERE id = ? AND category_type = ?",
      [result.category.name, result.category.slug, id, result.category.categoryType]
    );
    if (!updateResult.affectedRows) {
      const [rows] = await pool.execute("SELECT id FROM categories WHERE id = ? AND category_type = ? LIMIT 1", [id, categoryType]);
      if (!rows.length) {
        response.status(404).json({ error: "Category not found." });
        return;
      }
    }
    response.status(204).end();
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      response.status(409).json({ error: "A category with that name already exists." });
      return;
    }
    next(error);
  }
});

app.delete("/api/admin/categories/:id", checkSameOrigin, requireAdmin, async (request, response, next) => {
  const id = positiveId(request.params.id);
  if (!id) {
    response.status(400).json({ error: "Category ID must be a positive integer." });
    return;
  }
  try {
    const [deleteResult] = await pool.execute("DELETE FROM categories WHERE id = ?", [id]);
    if (!deleteResult.affectedRows) {
      response.status(404).json({ error: "Category not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_ROW_IS_REFERENCED") {
      response.status(409).json({ error: "Category is in use and cannot be deleted." });
      return;
    }
    next(error);
  }
});

app.get(["/admin", "/admin.html", "/admin.php"], requireAdminPage, (request, response) => {
  response.set("Cache-Control", "no-store");
  response.sendFile(path.join(ROOT, "admin.html"));
});

app.get(["/admin-login", "/admin-login.html", "/admin-login.php"], (request, response) => {
  response.sendFile(path.join(ROOT, "admin-login.html"));
});

app.use("/api", (request, response) => {
  response.status(404).json({ error: "API endpoint not found." });
});

app.use((request, response, next) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.sendStatus(400);
    return;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.some(segment => segment === ".git" || segment === "node_modules" || segment === "scripts" || segment === "sql" || segment === "test")
    || BLOCKED_STATIC_PATHS.has(path.basename(pathname))
    || segments.some(segment => segment.startsWith(".env")) || pathname.endsWith(".php")
  ) {
    response.sendStatus(404);
    return;
  }
  next();
});

app.use(express.static(ROOT, { dotfiles: "deny", index: "index.html" }));

app.use((error, request, response, next) => {
  console.error("Request failed:", error);
  if (response.headersSent) {
    next(error);
    return;
  }
  response.status(500).json({ error: "The server could not complete the request." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`InterviewEdge is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
