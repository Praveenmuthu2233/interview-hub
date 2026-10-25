const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter your new admin password: ", async (password) => {
    try {
        if (password.length < 12) {
            console.log("Use a password with at least 12 characters.");
            return;
        }

        const hash = await bcrypt.hash(password, 12);

        console.log("\n$2b$12$z/7.vC4jauBqPuL8zhJxE.NEPPZX8h5Ae5cXWthmTNZqokKmxWm5i\n");
        console.log(hash);
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();
    }
});