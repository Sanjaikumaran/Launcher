const fs = require("fs");
const path = require("path");
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

// Function to get all folders and their images in a directory as a tree array
function getFolderTree(directory) {
  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    const folder = {
      name: path.basename(currentPath),
      images: [],
      children: [],
    };

    items.forEach((item) => {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const childFolder = walkDir(itemPath);
        if (childFolder.images.length > 0 || childFolder.children.length > 0) {
          folder.children.push(childFolder);
        }
      } else if (stats.isFile() && isImageFile(item)) {
        folder.images.push(item);
      }
    });

    return folder;
  }

  function isImageFile(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
  }

  const rootFolder = walkDir(directory);
  return rootFolder.children.filter((folder) => folder.images.length > 0);
}

const localIPs = getLocalIPs();
const port = 8000;

// Endpoint to get the folder tree
app.get("/folder-tree", (req, res) => {
  const folderTree = getFolderTree(path.join(__dirname, "assets"));
  res.json(folderTree);
});

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
    const url = `http://${lastIP}:${port}/slideshow.html`;
    if (platform === "win32") {
      exec(`powershell -NoProfile -Command "Start-Process '${url}'"`); // For Windows
    } else if (platform === "darwin") {
      exec(`open ${url}`); // For macOS
    } else {
      exec(`xdg-open ${url}`); // For Linux
    }
  }
});
