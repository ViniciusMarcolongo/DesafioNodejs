import http from "node:http";
import { readDatabase, writeDatabase} from "./db/database.js";
import {readJsonBody} from "./utils/readJsonBody.js";
import { randomUUID } from "node:crypto";


const PORT = 3333;

const server = http.createServer(async (req, res) => {
    const {method, url} = req;

    if(method === "GET" && url.startsWith("/tasks")) {
        const db = await readDatabase()

        const tasks = Array.isArray(db.tasks) ? db.tasks : []

        const fullUrl = new URL(req.url,`http://${req.headers.host}`)
        const qTitle = fullUrl.searchParams.get("title")
        const qDescription = fullUrl.searchParams.get("description")
        const t = qTitle ? qTitle.trim().toLowerCase() : null
        const d = qDescription ? qDescription.trim().toLowerCase() : null

        const filtered = tasks.filter(task => {
            const titleOk = !t || String(task.title || "").toLowerCase().includes(t)
            const descOk = !d || String(task.description || "").toLowerCase().includes(d)
            return titleOk && descOk
        })

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(filtered));
    }

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

    if (method === "PUT") {
        const fullUrl = new URL(req.url, `http://${req.headers.host}`);

        const pathname = fullUrl.pathname
        const match = pathname.match(/^\/tasks\/([^/]+)$/)

        if (!match) {
        } else {
            const id = match[1];

            try {
                const body = await readJsonBody(req);
                const wantsTitle = Object.prototype.hasOwnProperty.call(body, "title");
                const wantsDesc = Object.prototype.hasOwnProperty.call(body, "description");

                if (!wantsTitle && !wantsDesc) {
                    res.writeHead(400, {"Content-Type": "application/json" })
                    return res.end(JSON.stringify({
                        error: "Envie ao menos um campo: title e/ou description."
                    }))
                }

                if (wantsTitle) {
                    const ok = typeof body.title === "string" && body.title.trim() !== "";
                    if (!ok) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        return res.end(JSON.stringify({ error: "title deve ser string não vazia." }));
                    }
                }

                if (wantsDesc) {
                    const ok = typeof body.description === "string" && body.description.trim() !== "";
                    if (!ok){
                        res.writeHead(400, { "Content-Type": "application/json" });
                        return res.end(JSON.stringify({ error: "description deve ser string não vazia." }));
                    }
                }

                const db = await readDatabase();
                const tasks = Array.isArray(db.tasks) ? db.tasks : [];
                const index = tasks.findIndex(t => t.id === id);

                if (index === -1){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: `Task com id '${id}' não encontrada.` }));
                }

                const task = tasks[index];
                if (wantsTitle) task.title = body.title.trim();
                if (wantsDesc) task.description = body.description.trim();

                task.updated_at = new Date().toISOString();

                db.tasks = tasks;
                await writeDatabase(db);

                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(JSON.stringify(task));

            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: err.message || "Invalid JSON" }));
            }
        }
    }

    if (method === "DELETE") {
        const fullUrl = new URL(req.url, `http://${req.headers.host}`)

        const pathname = fullUrl.pathname;

        const parts = pathname.split("/").filter(Boolean);

        const isTasksId = parts.length === 2 && parts[0] === "tasks";
        if (!isTasksId) {

        } else {
            const id = parts[1];
            
            try {
                const db = await readDatabase();
                const tasks = Array.isArray(db.tasks) ? db.tasks : [];

                const index = tasks.findIndex(t => t.id === id);

                if(index === -1){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: `Task com id '${id}' não encontrada.` }));
                }

                tasks.splice(index, 1);

                db.tasks = tasks;
                await writeDatabase(db);

                res.writeHead(204);
                return res.end();


            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "Erro interno ao remover a tarefa." }));
            }
        }
    }

    if (method === "PATCH") {
        const fullUrl = new URL(req.url, `http://${req.headers.host}`);

        const pathname = fullUrl.pathname;

        const parts = pathname.split("/").filter(Boolean);

        const isToggle = parts.length === 3 && parts[0] === "tasks" && parts[2] === "complete";

        if (!isToggle) {

        } else {
            const id = parts[1];

            try{
                const db = await readDatabase();
                const tasks = Array.isArray(db.tasks) ? db.tasks : [];
                const index = tasks.findIndex(t => t.id === id);

                if (index === -1) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: `Task com id '${id}' não encontrada.` }));
                }

                const task = tasks[index]
                const now = new Date().toISOString();
                task.completed_at = task.completed_at ? null : now;
                task.updated_at = now;

                db.tasks = tasks;
                await writeDatabase(db);

                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(JSON.stringify(task));

            } catch (err){
                res.writeHead(500, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "Erro interno ao acessar o banco." }));
            }
        }
    }


    res.writeHead(404, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "Rota não encontrada"}));
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
});