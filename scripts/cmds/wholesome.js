const axios = require('axios');
const jimp = require("jimp");
const fs = require("fs");

module.exports = {
  config: {
    name: "crush",
    aliases: ["ws", "happy", "love"],
    version: "1.1",
    author: "AceGun",
    countDown: 1,
    role: 2,
    shortdescription: "impress",
    longDescription: "wholesome avatar for crush/lover",
    category: "love",
    guide: "Tag someone or reply to someone with "
  },

  onStart: async function ({ message, event, args }) {
    let targetID;
    let senderID = event.senderID;
    if (args[0] && /^\d+$/.test(args[0])) {
      targetID = args[0];
    }
    else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } 
    else if (Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } 
    else {
      targetID = senderID;
    }
    
    try {
      let senderName = "Someone";
      try {
        const senderInfo = await global.api.getUserInfo(senderID);
        senderName = senderInfo[senderID].name || "Someone";
      } catch (nameError) {
        console.error("Error getting user name:", nameError);
      }
      
      const imagePath = await createImage(targetID);
      if (fs.existsSync(imagePath)) {
        await message.reply({
          body: `${senderName} told me,`,
          attachment: fs.createReadStream(imagePath),
          mentions: [{ tag: senderName, id: senderID }]
        }, event.threadID, targetID);
      } else {
        throw new Error("Image file not created");
      }
    } catch (error) {
      console.error("Error details:", error);
      await message.reply(`An error occurred: ${error.message}`);
    }
  }
};

async function createImage(userID) {
  try {
    const avatarURL = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    
    const avatarResponse = await axios.get(avatarURL, { responseType: 'arraybuffer' });
    const avatarBuffer = Buffer.from(avatarResponse.data, 'binary');
    
    const avatar = await jimp.read(avatarBuffer);
    const template = await jimp.read("https://i.imgur.com/BnWiVXT.jpg");
    
    template.resize(512, 512).composite(avatar.resize(173, 173), 70, 186);
    
    const imagePath = `wholesome_${Date.now()}.png`;
    await template.writeAsync(imagePath);
    return imagePath;
  } catch (error) {
    console.error("Error in createImage:", error);
    throw new Error(`Failed to create image: ${error.message}`);
  }
}