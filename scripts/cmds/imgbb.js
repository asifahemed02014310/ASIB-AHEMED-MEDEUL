const axios = require('axios');

const baseApiUrl = async () => {
  const base = await axios.get('https://raw.githubusercontent.com/EwrShAn25/ShAn.s-Api/refs/heads/main/Api.json');
  return base.data.shan;
};

module.exports = {
  config: {
    name: "imgbb",
    aliases: ["i"],
    version: "1.0",
    author: "𝗦𝗵𝗔𝗻",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Convert image to an ImgBB URL"
    },
    longDescription: {
      en: "Upload image to imgbb by replying to a photo using an external API"
    },
    category: "Tool",
    guide: {
      en: "{p}{n} [reply to an image]"
    }
  },

  onStart: async function ({ api, event }) {
    if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
      return api.sendMessage('⚠️ Please reply to an image to upload it to ImgBB.', event.threadID, event.messageID);
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== "photo") {
      return api.sendMessage('❌ The replied message is not an image.', event.threadID, event.messageID);
    }

    const linkanh = attachment.url;

    try {
      const apiUrl = `${await baseApiUrl()}/ShAn/imgbb`;
      const ShAn = await axios.post(apiUrl, {
        imageUrl: linkanh
      });

      if (!ShAn.data || !ShAn.data.imageUrl) {
        throw new Error('Invalid response from API');
      }

      const ShaN = ShAn.data.imageUrl;
      return api.sendMessage(`✅ Image uploaded successfully!\n\n🔗Link :${ShaN}`, event.threadID, event.messageID);
    } catch (error) {
      console.error('ImgBB Upload Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload image';
      return api.sendMessage(`❌ Error: ${errorMessage}`, event.threadID, event.messageID);
    }
  }
};
