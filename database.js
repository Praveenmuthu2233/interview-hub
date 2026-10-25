"use strict";

const mysql = require("mysql2/promise");

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const database = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database: requiredEnvironment("DB_NAME"),
  user: requiredEnvironment("DB_USER"),
  password: requiredEnvironment("DB_PASSWORD"),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  dateStrings: ["DATE"],
  timezone: "Z"
};

if (process.env.INSTANCE_CONNECTION_NAME) {
  database.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
  delete database.host;
  delete database.port;
}

module.exports = mysql.createPool(database);
