import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";

const CSV_PATH = path.resolve("import", "tasks.csv");

const fileStream = fs.createReadStream(CSV_PATH);

const csvStream = parse({
  columns: true,
  trim: true,
  skip_empty_lines: true, 
})

fileStream.pipe(csvStream);

for await (const record of csvStream) {
    const { title, description } = record;
    const payload = { title, description };

    try {
        const response = await fetch("http://localhost:3333/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = text; 
        }
        console.log(
            `POST /tasks → ${response.status}`,
            response.ok ? "✅ sucesso" : "❌ erro",
            data
        );

    } catch (err){
        console.error("Erro ao enviar requisição:", err.message);
    }
}
console.log("Importação concluída!");