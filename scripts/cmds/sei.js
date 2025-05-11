const axios = require('axios');
const baseApiUrl = async () => {
  const base = await axios.get('https://raw.githubusercontent.com/EwrShAn25/ShAn.s-Api/refs/heads/main/Api.json');
  return base.data.shan;
};

module.exports = {
  config: { 
    name: "sei",
    aliases: ["sei","girls"],
    version: "2.0",
    author: "𝗦𝗵𝗔𝗻", // DO NOT CHANGE AUTHOR INFORMATION
    countDown: 20,
    role: 0,
    shortDescription: "",
    longDescription: "send you a hot girl video",
    category: "18+",
    guide: "{p}{n}",
  },

  onStart: async function ({ message }) {
    try {
      const loadingMessage = await message.reply(" Lucca 2 min tham ");
      
      const ShAn = await axios.get(`${await baseApiUrl()}/ShAn/girlsvideo`, {
        timeout: 10000 // 10 seconds timeout
      });
      
      if (!ShAn.data || !ShAn.data.url) {
        throw new Error("❌ Invalid API response format");
      }
      
      const ShaN = ShAn.data.url;
      
      message.reply({
        body: 'dekh dekh sei',
        attachment: await global.utils.getStreamFromURL(ShaN)
      });

      await message.unsend(loadingMessage.messageID);
      
    } catch (error) {
      console.error('Error:', error);
      
      try {
        await message.reply("⚠️ Sorry, the video couldn't be loaded right now. Possible reasons:\n\n• API server is down.");
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }
};
