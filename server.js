import express from "express";
import { FreeSwitchClient, once } from "esl";

const app = express();
app.use(express.json());

/**
 * ESL CLIENT CONFIG
 */
const fsClient = new FreeSwitchClient({
  host: "127.0.0.1",
  port: 8021,
  password: "ClueCon",
  logger: {
    debug: (...args) => console.debug("[ESL DEBUG]", ...args),
    info: (...args) => console.info("[ESL INFO]", ...args),
    error: (...args) => console.error("[ESL ERROR]", ...args),
  },
});

let fsCall = null;

/**
 * Connect to FreeSWITCH once at startup
 */
async function connectFreeSwitch() {
  try {
    const p = once(fsClient, "connect");
    await fsClient.connect();
    const [call] = await p;
    fsCall = call;
    console.log("✅ Connected to FreeSWITCH ESL");
  } catch (err) {
    console.error("❌ Failed to connect to FreeSWITCH", err);
  }
}

connectFreeSwitch();

/**
 * Helper to safely run bgapi commands
 */
async function runBgApi(command) {
  if (!fsCall) {
    throw new Error("Not connected to FreeSWITCH");
  }

  console.log("➡️ Sending bgapi command:", command);
  const res = await fsCall.bgapi(command, 5000);
  console.log({ res });

  console.log("⬅️ Raw response body:", res.body);
  return res.body;
}

/**
 * HEALTH CHECK
 */
app.get("/health", async (req, res) => {
  console.log("[GET] /health");

  try {
    const data = {
      connected: !!fsCall,
      timestamp: new Date().toISOString(),
    };

    console.log("➡️ Response payload:", data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * FREESWITCH STATUS
 * Equivalent to: fs_cli -x "status"
 */
app.get("/freeswitch/status", async (req, res) => {
  console.log("[GET] /freeswitch/status");

  try {
    const body = await runBgApi("status");

    console.log("➡️ Sending response to client:", body);
    res.json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ACTIVE CALLS
 * fs_cli -x "show calls"
 */
app.get("/freeswitch/calls", async (req, res) => {
  console.log("[GET] /freeswitch/calls");

  try {
    const body = await runBgApi("show calls as json");

    console.log("➡️ Sending response to client:", body);
    res.json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * CHANNELS
 * fs_cli -x "show channels"
 */
app.get("/freeswitch/channels", async (req, res) => {
  console.log("[GET] /freeswitch/channels");

  try {
    const body = await runBgApi("show channels as json");

    console.log("➡️ Sending response to client:", body);
    res.json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * REGISTRATIONS
 * fs_cli -x "show registrations"
 */
app.get("/freeswitch/registrations", async (req, res) => {
  console.log("[GET] /freeswitch/registrations");

  try {
    const body = await runBgApi("show registrations as json");

    console.log("➡️ Sending response to client:", body);
    res.json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * UPTIME
 */
app.get("/freeswitch/uptime", async (req, res) => {
  console.log("[GET] /freeswitch/uptime");

  try {
    const body = await runBgApi("uptime");

    console.log("➡️ Sending response to client:", body);
    res.json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * EXPRESS START
 */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});
