const express = require("express");
const { FreeSwitchClient } = require("esl");

const app = express();
const PORT = 3000;

app.use(express.json());

const client = new FreeSwitchClient({
  host: "127.0.0.1",
  port: 8021,
  password: "ClueCon",
});

let isConnected = false;

client.on("connect", () => {
  console.log("🔌 TCP socket connected, waiting for authentication...");
});

client.on("ready", () => {
  isConnected = true;
  console.log("✅ Successfully authenticated with FreeSWITCH!");
  console.log("Connection established at:", new Date().toLocaleString());
});

client.on("error", (error) => {
  isConnected = false;
  console.error("❌ FreeSWITCH Connection Error:", error.message);
});

client.on("reconnecting", (retry) => {
  isConnected = false;
  console.log(`🔄 Reconnecting to FreeSWITCH in ${retry}ms...`);
});

client.on("warning", (data) => {
  console.warn("⚠️  Warning:", data);
});

client.on("end", () => {
  isConnected = false;
  console.log("🔌 Disconnected from FreeSWITCH");
});

console.log("Attempting to connect to FreeSWITCH...");
client.connect();

// Helper function to execute FreeSWITCH API commands
async function executeCommand(command) {
  if (!isConnected) {
    throw new Error("FreeSWITCH is not connected");
  }

  try {
    const response = await client.api(command);
    return response.body;
  } catch (error) {
    throw new Error(`Failed to execute command: ${error.message}`);
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "FreeSWITCH Integration Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/status", (req, res) => {
  res.json({
    freeswitch_connected: isConnected,
    server_status: "online",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  if (isConnected) {
    res.status(200).json({
      status: "healthy",
      freeswitch: "connected",
    });
  } else {
    res.status(503).json({
      status: "unhealthy",
      freeswitch: "disconnected",
    });
  }
});

// 1. Get all active calls/channels
app.get("/api/calls", async (req, res) => {
  try {
    const data = await executeCommand("show calls as json");
    const calls = JSON.parse(data);
    res.json({
      success: true,
      total_calls: calls.row_count || 0,
      calls: calls.rows || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 2. Get all active channels
app.get("/api/channels", async (req, res) => {
  try {
    const data = await executeCommand("show channels as json");
    const channels = JSON.parse(data);
    res.json({
      success: true,
      total_channels: channels.row_count || 0,
      channels: channels.rows || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 3. Get FreeSWITCH system status
app.get("/api/system/status", async (req, res) => {
  try {
    const data = await executeCommand("status");
    res.json({
      success: true,
      status: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 4. Get all registered SIP users/extensions
app.get("/api/registrations", async (req, res) => {
  try {
    const data = await executeCommand("show registrations as json");
    const registrations = JSON.parse(data);
    res.json({
      success: true,
      total_registrations: registrations.row_count || 0,
      registrations: registrations.rows || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 5. Get gateway status (trunks)
app.get("/api/gateways", async (req, res) => {
  try {
    const data = await executeCommand("sofia status gateway as json");
    const gateways = JSON.parse(data);
    res.json({
      success: true,
      total_gateways: gateways.row_count || 0,
      gateways: gateways.rows || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 6. Get call statistics/summary
app.get("/api/stats/calls", async (req, res) => {
  try {
    const data = await executeCommand("show calls count");
    res.json({
      success: true,
      active_calls: parseInt(data.trim()) || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 7. Get detailed call information by UUID
app.get("/api/calls/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const data = await executeCommand(`uuid_dump ${uuid}`);

    // Parse the output into key-value pairs
    const lines = data.split("\n");
    const callInfo = {};
    lines.forEach((line) => {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        callInfo[key.trim()] = valueParts.join(":").trim();
      }
    });

    res.json({
      success: true,
      uuid: uuid,
      call_info: callInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 8. Get Sofia SIP profiles status
app.get("/api/sip/profiles", async (req, res) => {
  try {
    const data = await executeCommand("sofia status");
    res.json({
      success: true,
      profiles: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 9. Get complete module list
app.get("/api/modules", async (req, res) => {
  try {
    const data = await executeCommand("show modules as json");
    const modules = JSON.parse(data);
    res.json({
      success: true,
      total_modules: modules.row_count || 0,
      modules: modules.rows || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 10. Get codec information
app.get("/api/codecs", async (req, res) => {
  try {
    const data = await executeCommand("show codec");
    res.json({
      success: true,
      codecs: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 11. Get complete system information
app.get("/api/system/info", async (req, res) => {
  try {
    const [status, uptime, sessions] = await Promise.all([
      executeCommand("status"),
      executeCommand("strepoch"),
      executeCommand("show sessions as json"),
    ]);

    const sessionData = JSON.parse(sessions);

    res.json({
      success: true,
      system: {
        status: status,
        uptime_epoch: uptime.trim(),
        total_sessions: sessionData.row_count || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 12. Get API command list (helpful for developers)
app.get("/api/commands", async (req, res) => {
  try {
    const data = await executeCommand("show api");
    const commands = data.split("\n").filter((cmd) => cmd.trim());
    res.json({
      success: true,
      total_commands: commands.length,
      commands: commands,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// BONUS: Originate a call (POST endpoint)
app.post("/api/calls/originate", async (req, res) => {
  try {
    const { from, to, context = "default" } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: "Both 'from' and 'to' parameters are required",
      });
    }

    const command = `originate user/${from} &bridge(user/${to})`;
    const data = await executeCommand(command);

    res.json({
      success: true,
      message: "Call initiated",
      response: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// BONUS: Hangup a call by UUID (DELETE endpoint)
app.delete("/api/calls/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const data = await executeCommand(`uuid_kill ${uuid}`);

    res.json({
      success: true,
      message: "Call terminated",
      uuid: uuid,
      response: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== HISTORICAL/STORED DATA ENDPOINTS ==========

// 1. Get CDR (Call Detail Records) - stored call history
app.get("/api/cdr/recent", async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const data = await executeCommand(`cdr_csv recent ${limit}`);

    res.json({
      success: true,
      message: "Recent call detail records",
      records: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 2. Get voicemail messages for a user
app.get("/api/voicemail/:user", async (req, res) => {
  try {
    const { user } = req.params;
    const domain = req.query.domain || "default";

    // Execute vm_fsdb command to get voicemail info
    const data = await executeCommand(`vm_fsdb pref ${domain}/${user}`);

    res.json({
      success: true,
      user: user,
      domain: domain,
      voicemail_data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 3. Get complete dialplan configuration
app.get("/api/config/dialplan", async (req, res) => {
  try {
    const data = await executeCommand("xml_locate dialplan");

    res.json({
      success: true,
      message: "Current dialplan configuration",
      dialplan: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 4. Get directory/user configuration
app.get("/api/config/directory", async (req, res) => {
  try {
    const domain = req.query.domain || "default";
    const data = await executeCommand(
      `xml_locate directory domain name ${domain}`
    );

    res.json({
      success: true,
      domain: domain,
      directory: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 5. Get user/extension details
app.get("/api/users/:extension", async (req, res) => {
  try {
    const { extension } = req.params;
    const domain = req.query.domain || "default";

    const data = await executeCommand(`user_data ${extension}@${domain}`);

    res.json({
      success: true,
      extension: extension,
      domain: domain,
      user_data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 6. Get global variables (FreeSWITCH configuration variables)
app.get("/api/config/globals", async (req, res) => {
  try {
    const data = await executeCommand("global_getvar");

    // Parse variables into object
    const lines = data.split("\n").filter((line) => line.trim());
    const variables = {};
    lines.forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        variables[key.trim()] = valueParts.join("=").trim();
      }
    });

    res.json({
      success: true,
      total_variables: Object.keys(variables).length,
      variables: variables,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 7. Get specific global variable
app.get("/api/config/globals/:variable", async (req, res) => {
  try {
    const { variable } = req.params;
    const data = await executeCommand(`global_getvar ${variable}`);

    res.json({
      success: true,
      variable: variable,
      value: data.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 8. Get Sofia profile configuration
app.get("/api/config/sofia/:profile", async (req, res) => {
  try {
    const { profile } = req.params;
    const data = await executeCommand(`sofia status profile ${profile}`);

    res.json({
      success: true,
      profile: profile,
      configuration: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 9. Get complete XML configuration
app.get("/api/config/xml", async (req, res) => {
  try {
    const section = req.query.section || "configuration";
    const data = await executeCommand(`xml_locate ${section}`);

    res.json({
      success: true,
      section: section,
      xml_config: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 10. Get aliases (speed dial / shortcuts)
app.get("/api/config/aliases", async (req, res) => {
  try {
    const data = await executeCommand("alias");

    res.json({
      success: true,
      aliases: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 11. Get complete list of tasks/scheduled tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const data = await executeCommand("show tasks as json");
    const tasks = JSON.parse(data);

    res.json({
      success: true,
      total_tasks: tasks.row_count || 0,
      tasks: tasks.rows || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 12. Get NAT (Network Address Translation) mappings
app.get("/api/config/nat", async (req, res) => {
  try {
    const data = await executeCommand("nat_map status");

    res.json({
      success: true,
      nat_mappings: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🌐 Express server running on http://localhost:${PORT}`);
  console.log(`\n📋 REAL-TIME DATA ENDPOINTS:`);
  console.log(`   GET  /                      - Server info`);
  console.log(`   GET  /status                - Connection status`);
  console.log(`   GET  /health                - Health check`);
  console.log(`   GET  /api/calls             - All active calls`);
  console.log(`   GET  /api/channels          - All active channels`);
  console.log(`   GET  /api/system/status     - FreeSWITCH status`);
  console.log(`   GET  /api/registrations     - SIP registrations`);
  console.log(`   GET  /api/gateways          - Gateway/trunk status`);
  console.log(`   GET  /api/stats/calls       - Call count`);
  console.log(`   GET  /api/calls/:uuid       - Call details by UUID`);
  console.log(`   GET  /api/sip/profiles      - SIP profiles`);
  console.log(`   GET  /api/modules           - Loaded modules`);
  console.log(`   GET  /api/codecs            - Available codecs`);
  console.log(`   GET  /api/system/info       - Complete system info`);
  console.log(`   GET  /api/commands          - Available API commands`);
  console.log(`\n📦 STORED/CONFIGURATION DATA ENDPOINTS:`);
  console.log(
    `   GET  /api/cdr/recent        - Recent call detail records (CDR)`
  );
  console.log(`   GET  /api/voicemail/:user   - Voicemail messages for user`);
  console.log(`   GET  /api/config/dialplan   - Dialplan configuration`);
  console.log(`   GET  /api/config/directory  - Directory configuration`);
  console.log(`   GET  /api/users/:extension  - User/extension details`);
  console.log(`   GET  /api/config/globals    - All global variables`);
  console.log(`   GET  /api/config/globals/:var - Specific global variable`);
  console.log(`   GET  /api/config/sofia/:profile - Sofia profile config`);
  console.log(`   GET  /api/config/xml        - Complete XML configuration`);
  console.log(`   GET  /api/config/aliases    - Configured aliases`);
  console.log(`   GET  /api/tasks             - Scheduled tasks`);
  console.log(`   GET  /api/config/nat        - NAT mappings`);
  console.log(`\n⚡ ACTION ENDPOINTS:`);
  console.log(`   POST /api/calls/originate   - Initiate a call`);
  console.log(`   DEL  /api/calls/:uuid       - Hangup a call`);
});

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  client.end();
  process.exit(0);
});
