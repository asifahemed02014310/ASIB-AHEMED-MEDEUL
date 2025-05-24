const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "gokgok",
    version: "1.0",
    author: "Nur Hamim",
    countDown: 0,
    role: 0,
    shortDescription: "no prefix",
    longDescription: "Triggers on 'gok gok' messages",
    category: "no prefix",
  },

  onStart: async function () {},

  onChat: async function ({ event, message }) {
    if (event.body && /\bgok[\W_]*gok\b/i.test(event.body)) {
      const filePath = path.join(__dirname, "voice", "gokgok.mp3");
      if (!fs.existsSync(filePath)) {
        console.error("Voice file not found:", filePath);
        return;
      }

      try {
        return await message.reply({
          body: "",
          attachment: fs.createReadStream(filePath)
        });
      } catch (err) {
        console.error("Error sending gokgok voice message:", err);
      }
    }
  }
};
