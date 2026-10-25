"use strict";

const bcrypt = require("bcrypt");
const readline = require("node:readline");

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Run this script in an interactive terminal so the password is not echoed.");
  process.exit(1);
}

process.stdout.write("Admin password to hash: ");
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();

let password = "";

process.stdin.on("data", async character => {
  if (character === "\u0003") {
    process.stdout.write("\nCancelled.\n");
    process.exit(1);
  }

  if (character === "\r" || character === "\n") {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
    if (!password) {
      console.error("Password must not be empty.");
      process.exitCode = 1;
      return;
    }

    try {
      const hash = await bcrypt.hash(password, 12);
      password = "";
      console.log(hash);
    } catch (error) {
      password = "";
      console.error("Could not hash the password:", error.message);
      process.exitCode = 1;
    }
    return;
  }

  if (character === "\u007f" || character === "\b") {
    password = password.slice(0, -1);
    return;
  }

  password += character;
});
