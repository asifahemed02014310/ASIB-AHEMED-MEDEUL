const fs = require("fs");
const path = require("path");
// Ensure DIG is properly imported
const DIG = require("discord-image-generation");

module.exports = {
  config: {
    name: "trash",
    version: "1.5",
    author: "Nur",
    countDown: 2,
    role: 0,
    shortDescription: "Trash image",
    longDescription: "Generate a trash meme with someone's avatar",
    category: "funny",
    guide: {
      vi: "{pn} [@tag | reply | để trống | uid]",
      en: "{pn} [@tag | reply | leave empty for yourself | uid]"
    }
  },

  onStart: async function ({ event, message, usersData, args }) {
    let uid;
    
    // Check if a UID was provided as an argument
    if (args.length > 0 && /^\d+$/.test(args[0])) {
      uid = args[0];
    }
    // Check if the message is a reply
    else if (event.messageReply) {
      uid = event.messageReply.senderID;
    } 
    // Check if there's a mention
    else if (Object.keys(event.mentions).length > 0) {
      uid = Object.keys(event.mentions)[0];
    } 
    // If no reply, mention, or UID argument, use the sender's ID
    else {
      uid = event.senderID;
    }

    // Handle special cases for specific UIDs
    if (uid === "100034630383353") {
      return message.reply("You are the trash 🐸🐸.");
    }

    try {
      const avatarURL = await usersData.getAvatarUrl(uid);
      if (!avatarURL) {
        return message.reply("Could not get the avatar of this user.");
      }
      
      const img = await new DIG.Trash().getImage(avatarURL);
      const pathSave = path.join(__dirname, "tmp", `${uid}_Trash.png`);

      // Ensure tmp directory exists
      const tmpDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpDir)){
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      fs.writeFileSync(pathSave, Buffer.from(img));
      
      // Get username for better response
      const userData = await usersData.get(uid);
      const username = userData ? userData.name || "this person" : "this person";
      
      await message.reply({
        body: `${username} belongs in the trash! 🗑️`,
        attachment: fs.createReadStream(pathSave),
      });
    } catch (error) {
      console.error("Error while processing the trash command:", error);
      message.reply("Tor kopal kharap pic process hocche na🧏‍♂️");
    } finally {
      // Clean up the temporary file after use
      const pathSave = path.join(__dirname, "tmp", `${uid}_Trash.png`);
      if (fs.existsSync(pathSave)) {
        fs.unlinkSync(pathSave);
      }
    }
  }
};