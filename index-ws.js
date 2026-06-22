import { Database } from "bun:sqlite";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

/** ---------------- SQLITE (Bun SQLite) ---------------- **/
const db = new Database("memory.db");

// table
db.run(`
  CREATE TABLE IF NOT EXISTS visitors (
    count INTEGER,
    time TEXT
  );
`);

/** ---------------- EXPRESS ---------------- **/
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: import.meta.dir });
});

/** ---------------- WEBSOCKET ---------------- **/
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const numClients = wss.clients.size;

  console.log("clients connected:", numClients);
  wss.broadcast(`Current visitors: ${numClients}`);

  ws.send("welcome!");

  // INSERT (Bun style)
  const stmt = db.prepare(
    "INSERT INTO visitors (count, time) VALUES (?, datetime('now'))"
  );
  stmt.run(numClients);

  ws.on("close", () => {
    wss.broadcast(`Current visitors: ${wss.clients.size}`);
    console.log("A client has disconnected");
  });

  ws.on("error", () => {});
});

/** ---------------- BROADCAST ---------------- **/
wss.broadcast = (data) => {
  console.log("Broadcasting:", data);

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
};

/** ---------------- SHUTDOWN ---------------- **/
function getCount() {
  const rows = db.query("SELECT * FROM visitors").all();

  rows.forEach((row) => {
    console.log(row);
  });
}

function shutDownDB() {
  getCount();
  console.log("shutting down");
  db.close();
}

process.on("SIGINT", () => {
  wss.clients.forEach(function each(client){
      client.close();
  })
  server.close(()=> {
    shutDownDB();
  });
});

/** ---------------- START ---------------- **/
server.listen(PORT, () => {
  console.log("Listening on " + PORT);
});