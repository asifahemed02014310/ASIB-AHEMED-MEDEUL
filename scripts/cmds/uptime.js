const os = require("os");
const moment = require('moment-timezone');

const startTime = new Date(); // Moved outside onStart

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "active"],
    author: "𝗦𝗵𝗔𝗻",
    countDown: 0,
    role: 0,
    category: "info",
    longDescription: {
      en: "Get System Information",
    },
  },
  
  onStart: async function ({ api, event, args, threadsData, usersData }) {
    try {
      const allUsers = await usersData.getAll();
      const allThreads = await threadsData.getAll();
      const uptime = process.uptime();

      // Calculate formatted uptime
      const now = moment().tz('Asia/Dhaka');
      const date = now.format('MMMM Do YYYY');
      const time = now.format('h:mm:ss A');
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      const uptimeString = `${days}d, ${hours}h, ${minutes}m, ${seconds}s`;

      const loadAverage = os.loadavg();
      const cpuUsage =
        os
          .cpus()
          .map((cpu) => cpu.times.user)
          .reduce((acc, curr) => acc + curr) / os.cpus().length;

      const totalMemoryGB = os.totalmem() / 1024 ** 3;
      const freeMemoryGB = os.freemem() / 1024 ** 3;
      const usedMemoryGB = totalMemoryGB - freeMemoryGB;

      const timeStart = Date.now();
      await api.sendMessage({
        body: "🔎-𝗖𝗵𝗲𝗰𝗸𝗶𝗻𝗴.....",
      }, event.threadID);

      const ping = Date.now() - timeStart;

      let pingStatus = "⛔| 𝖡𝖺𝖽 𝖲𝗒𝗌𝗍𝖾𝗆";
      if (ping < 1000) {
        pingStatus = "𝖲𝗆𝗈𝗈𝗍𝗁❤️‍🔥..";
      }
      const systemInfo = `♡   ∩_∩
 （„• ֊ •„)♡
╭─∪∪────────────⟡
│ 𝗨𝗣𝗧𝗜𝗠𝗘 𝗜𝗡𝗙𝗢
├───────────────⟡
│🚀 𝗔𝗖𝗧𝗜𝗩𝗘 𝗧𝗜𝗠𝗘..
│  ${uptimeString}
├───────────────⟡
│𝗗𝗮𝘁𝗲: ${date}
│𝗧𝗶𝗺𝗲: ${time}
│𝗨𝘀𝗲𝗿: ${allUsers.length}
│𝗧𝗵𝗿𝗲𝗮𝗱𝘀: ${allThreads.length}
│𝗣𝗶𝗻𝗴: ${ping}𝚖𝚜
│𝗦𝘆𝘀𝘁𝗲𝗺: ${pingStatus}
╰───────────────⟡
`;

      api.sendMessage(
        {
          body: systemInfo,
        },
        event.threadID,
        (err, messageInfo) => {
          if (err) {
            console.error("Error sending message with attachment:", err);
          } else {
            console.log(
              "Message with attachment sent successfully:",
              messageInfo,
            );
          }
        },
      );
    } catch (error) {
      console.error("Error retrieving system information:", error);
      api.sendMessage(
        "Unable to retrieve system information.",
        event.threadID,
        event.messageID,
      );
    }
  },
};