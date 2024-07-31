const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const os = require("os");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve the HTML files
app.use(express.static(__dirname));

// Generate a unique ID for each client
let clientIdCounter = 1;

// Function to get local IP address
function getLocalIP() {
  const networkInterfaces = os.networkInterfaces();
  let localIP = "Not found";

  for (const iface in networkInterfaces) {
    const ifaceDetails = networkInterfaces[iface];
    for (const detail of ifaceDetails) {
      if (detail.family === "IPv4" && !detail.internal) {
        localIP = detail.address;
        break;
      }
    }
    if (localIP !== "Not found") break;
  }

  return localIP;
}

const localIP = getLocalIP();
console.log(`Server is running at http://${localIP}:8000`);

wss.on("connection", (ws, req) => {
  // Assign a unique ID to the new client
  ws.id = clientIdCounter++;

  // Get the IP address of the client
  const ip = req.socket.remoteAddress;

  console.log(`New client connected: ID=${ws.id}, IP=${ip}`);

  ws.on("message", (message) => {
    console.log(`Received from client ID=${ws.id}, IP=${ip}:`, message);

    // Broadcast the message to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ID=${ws.id}, IP=${ip}`);
  });
});

server.listen(8000, () => {
  console.log("Server is listening on port 8000");
});
