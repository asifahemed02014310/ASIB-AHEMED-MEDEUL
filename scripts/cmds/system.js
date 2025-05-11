const si = require('systeminformation');

module.exports = {
  config: {
    name: "system",
    aliases: [],
    version: "1.0",
    author: "",
    countDown: 5,
    role: 0,
    shortDescription: "System",
    longDescription: "",
    category: "system",
    guide: "{pn}"
  },

  // Function to convert bytes to human-readable format
  byte2mb: function(bytes) {
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let l = 0, n = parseInt(bytes, 10) || 0;
    while (n >= 1024 && ++l) n = n / 1024;
    return `${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${units[l]}`;
  },

  onStart: async function ({ api, event }) {
    const { cpu, cpuTemperature, currentLoad, memLayout, diskLayout, mem, osInfo } = si;
    const timeStart = Date.now();

    try {
      const { manufacturer, brand, speed, physicalCores } = await cpu();
      const { main: mainTemp } = await cpuTemperature();
      const { currentLoad: load } = await currentLoad();
      const diskInfo = await diskLayout();
      const memInfo = await memLayout();
      const { total: totalMem, available: availableMem } = await mem();
      const { platform: OSPlatform, build: OSBuild } = await osInfo();

      const time = process.uptime();
      let hours = Math.floor(time / (60 * 60));
      let minutes = Math.floor((time % (60 * 60)) / 60);
      let seconds = Math.floor(time % 60);
      hours = hours < 10 ? "0" + hours : hours;
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      const systemInfo = (
        "𝗦𝘆𝘀𝘁𝗲𝗺 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻\n" +
        "𝗠𝗼𝗱𝗲𝗹: " + manufacturer + " " + brand + "\n" +
        "𝗦𝗽𝗲𝗲𝗱: " + speed + "GHz\n" +
        "𝗖𝗼𝗿𝗲𝘀: " + physicalCores + "\n" +
        "𝗧𝗲𝗺𝗽𝗲𝗿𝗮𝘁𝘂𝗿𝗲: " + mainTemp + "°C\n" +
        "𝗟𝗼𝗮𝗱: " + load.toFixed(1) + "%\n" +
        "𝗠𝗲𝗺𝗼𝗿𝘆: " + this.byte2mb(memInfo[0].size) + "\n" +
        "𝗧𝗼𝘁𝗮𝗹 𝗠𝗲𝗺: " + this.byte2mb(totalMem) + "\n" +
        "𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗠𝗲𝗺: " + this.byte2mb(availableMem) + "\n" +
        "𝗗𝗶𝘀𝗸: " + diskInfo[0].name + "\n" +
        "𝗗𝗶𝘀𝗸 𝗦𝗶𝗭𝗘: " + this.byte2mb(diskInfo[0].size) + "\n" +
        "𝗧𝗲𝗺𝗽𝗲𝗿𝗮𝘁𝘂𝗿𝗲: " + diskInfo[0].temperature + "°C\n" +
        "𝗢𝗦: " + OSPlatform + "\n" +
        "𝗕𝘂𝗶𝗹𝗱: " + OSBuild + "\n" +
        "𝗨𝗽𝗧𝗶𝗺𝗲: " + hours + ":" + minutes + ":" + seconds + "\n" +
        "𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲 𝗧𝗶𝗺𝗲: " + (Date.now() - timeStart) + "ms"
      );

      // Send message without any attachments
      api.sendMessage({ body: systemInfo }, event.threadID, event.messageID);
    }
    catch (e) {
      console.error(e);
    }
  }
};