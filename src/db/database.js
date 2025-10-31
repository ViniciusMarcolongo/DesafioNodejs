import fs from "node:fs/promises";
const DB_PATH = new URL("./db.json", import.meta.url);

export async function readDatabase() {
    try {
        const data = await fs.readFile(DB_PATH, "utf-8");
        return JSON.parse(data || "{}");
    } catch {
        return {};
    }
}

export async function writeDatabase(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}