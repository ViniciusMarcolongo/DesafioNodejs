export async function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let data = ""

        req.on("data", chunk => {
            data += chunk
        })

        req.on("end", () => {
            try{
                const json = data ? JSON.parse(data) : {}
                resolve(json)
            } catch (err) {
                reject(new Error("Invalid JSON"))
            }
        })
        req.on("error", reject)
    })
}