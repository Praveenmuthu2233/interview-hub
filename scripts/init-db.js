"use strict";

require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("../database");

async function initializeDatabase() {
  const schema = await fs.readFile(path.join(__dirname, "..", "sql", "schema.sql"), "utf8");
  const connection = await pool.getConnection();
  try {
    const statements = schema.split(";").map(statement => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log("Cloud SQL schema initialized.");
  } finally {
    connection.release();
    await pool.end();
  }
}

initializeDatabase().catch(error => {
  console.error("Could not initialize the Cloud SQL schema:", error.message);
  process.exitCode = 1;
});
