const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const os = require("os");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
const port = 8000;
const url = `http://${localIP}:${port}/video.html`;

console.log(`Server is running at ${url}`);

app.get("/config", (req, res) => {
  res.json({ localIP, port });
});

// Serve the HTML files
app.use(express.static(__dirname));

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

server.listen(port, () => {
  console.log("Server is listening on port 8000");
  // Open the browser with the specified URL
  const platform = process.platform;
  if (platform === "win32") {
    exec(`start ${url}`); // For Windows
  } else if (platform === "darwin") {
    exec(`open ${url}`); // For macOS
  } else {
    exec(`xdg-open ${url}`); // For Linux
  }
});
