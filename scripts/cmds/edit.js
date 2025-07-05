const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "edit",
    version: "1.0",
    author: "ShAn",
    role: 0,
    countDown: 20,
    description: {
      en: "Edit images via ShAn API"
    },
    category: "Tool",
    guide: {
      en: "Reply to an image with 'edit [prompt]'"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    try {
      const loadingMessage = await message.reply("⏳ Daraw Bbu Ditechi...");
      // Check for image
      if (!(event.messageReply?.attachments?.[0]?.type === "photo")) {
        return message.reply("❌ Reply to an image first");
      }

      const prompt = args.join(" ");
      if (!prompt) return message.reply("❌ Add editing instructions");

      const imageUrl = event.messageReply.attachments[0].url;
      const apiUrl = `https://shans-api-07-k7j4.onrender.com/ShAn/edit?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;

      // Call API
      const { data } = await axios.get(apiUrl);
      if (!data.url) throw new Error("API returned no image");

      // Download and send
      const tempPath = path.join(__dirname, `edit_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(tempPath);
      
      const response = await axios({
        url: data.url,
        method: 'GET',
        responseType: 'stream'
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      await message.reply({
        body: "✅ Edited successfully",
        attachment: fs.createReadStream(tempPath)
      });

      await message.unsend(loadingMessage.messageID);

      fs.unlinkSync(tempPath);
      
    } catch (error) {
      console.error(error);
      message.reply("❌ Failed to edit image. Error: " + error.message);
    }
  }
};
