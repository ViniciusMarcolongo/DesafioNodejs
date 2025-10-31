import http from "node:http";
import { readDatabase, writeDatabase} from "./db/database.js";
import {readJsonBody} from "./utils/readJsonBody.js";
import { randomUUID } from "node:crypto";

const PORT = 3333;

const server = http.createServer(async (req, res) => {
    const {method, url} = req;

    if(method === "GET" && url === "/health") {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({status: "ok"}));
        return
    }

    if (method === "POST" && url === "/tasks") {
        try{
            const body = await readJsonBody(req)

            const hasTitle = typeof body.title === "string" && body.title.trim() !== ""
            const hasDescription = typeof body.description === "string" && body.description.trim() !== ""

            if(!hasTitle || !hasDescription) {
                res.writeHead(400, { "Content-Type": "application/json" })
                return res.end(JSON.stringify({
                    error: "title e description são obrigatórios (string não vazia)."
                }))
            }

            const now = new Date().toISOString()
            const newTask = {
                id: randomUUID(),
                title: body.title.trim(),
                description: body.description.trim(),
                completed_at: null,
                created_at: now,
                updated_at: now
            }

            const db = await readDatabase()
            if (!db.tasks) db.tasks = []

            db.tasks.push(newTask)
            await writeDatabase(db)

            res.writeHead(201, { "Content-Type": "application/json" }); 
            return res.end(JSON.stringify(newTask));                      

        } catch (err){
            res.writeHead(400, {"Content-Type": "application/json"})
            return res.end(JSON.stringify({ error: err.message || "Invalid JSON"}))
        }
    }

    res.writeHead(404, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "Rota não encontrada"}));
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
});