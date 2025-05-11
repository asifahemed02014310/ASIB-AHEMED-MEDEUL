const DIG = require("discord-image-generation");
const fs = require("fs-extra");
const axios = require("axios").default;
const path = require("path");

module.exports = {
  config: {
    name: "train",
    version: "1.2",
    author: "milan-says",
    countDown: 5,
    role: 0,
    shortDescription: "train image",
    longDescription: "Generate a Thomas the train image with someone's avatar",
    category: "funny",
    guide: {
      vi: "{pn} [@tag | uid | reply | url]",
      en: "{pn} [@tag | uid | reply | url]"
    }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    try {
      const { threadID, messageID, senderID, messageReply } = event;
      
      // Create tmp directory if it doesn't exist
      const tmpDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      let uid;
      let avatarURL;
      
      // Case 1: User replied to a message
      if (messageReply) {
        uid = messageReply.senderID;
      } 
      // Case 2: User mentioned someone
      else if (Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
      }
      // Case 3: User provided a URL directly
      else if (args[0]?.match(/(https?:\/\/.*\.(?:png|jpg|jpeg))/i)) {
        avatarURL = args[0];
        uid = "customURL";
      }
      // Case 4: User provided a UID
      else if (args[0]?.match(/^\d+$/)) {
        uid = args[0];
      }
      // Case 5: No arguments, use sender's ID
      else {
        uid = senderID;
      }
      
      // If not a direct URL, get avatar URL from user ID
      if (!avatarURL) {
        try {
          avatarURL = await usersData.getAvatarUrl(uid);
        } catch (err) {
          return message.reply("⚠️ Error: Unable to get avatar URL. Please check if the ID is valid.");
        }
      }
      
      // Validate avatar URL
      if (!avatarURL) {
        return message.reply("⚠️ Error: Couldn't retrieve a valid avatar URL.");
      }
      
      // Generate image
      const img = await new DIG.Thomas().getImage(avatarURL);
      const pathSave = path.join(tmpDir, `${uid}_Thomas.png`);
      fs.writeFileSync(pathSave, Buffer.from(img));
      
      // Get username for the message
      let username = "this person";
      
      if (uid !== "customURL") {
        try {
          const userInfo = await usersData.get(uid);
          username = userInfo.name || "this person";
        } catch (err) {
          console.error("Error getting username:", err);
        }
      }
      
      // Send image
      return message.reply({
        body: `🚂 ${username} The train is coming!`,
        attachment: fs.createReadStream(pathSave)
      }, () => fs.unlinkSync(pathSave));
      
    } catch (error) {
      console.error(error);
      return message.reply(`⚠️ Error: ${error.message || "An unknown error occurred."}`);
    }
  }
};