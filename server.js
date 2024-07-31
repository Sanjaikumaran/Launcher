const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const os = require("os");
const { exec } = require("child_process");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Generate a unique ID for each client
let clientIdCounter = 1;

// Function to get all local IP addresses
function getLocalIPs() {
  const networkInterfaces = os.networkInterfaces();
  let localIPs = [];

  for (const iface in networkInterfaces) {
    const ifaceDetails = networkInterfaces[iface];
    for (const detail of ifaceDetails) {
      if (detail.family === "IPv4" && !detail.internal) {
        localIPs.push({ interface: iface, address: detail.address });
      }
    }
  }

  return localIPs;
}

const localIPs = getLocalIPs();
const port = 8000;

app.get("/config", (req, res) => {
  res.json({ localIPs, port });
});

// Serve the HTML files
app.use(express.static(__dirname));

wss.on("connection", (ws, req) => {
  // Assign a unique ID to the new client
  ws.id = clientIdCounter++;

  // Get the IP address of the client
  const ip = req.socket.remoteAddress;

  // Send the local IPs to the client
  ws.send(JSON.stringify(localIPs));

  ws.on("message", (message) => {
    // Broadcast the message to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

server.listen(port, () => {
  const platform = process.platform;
  const lastIP = localIPs[localIPs.length - 1].address;
  if (lastIP) {
    const url = `http://${lastIP}:${port}/video.html`;
    if (platform === "win32") {
      exec(`powershell -NoProfile -Command "Start-Process '${url}'"`); // For Windows
    } else if (platform === "darwin") {
      exec(`open ${url}`); // For macOS
    } else {
      exec(`xdg-open ${url}`); // For Linux
    }
  }
});
