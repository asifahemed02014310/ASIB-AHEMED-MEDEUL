const DIG = require("discord-image-generation");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "buttslap",
    version: "1.2",
    author: "KSHITIZ",
    countDown: 5,
    role: 0,
    shortDescription: "Buttslap image",
    longDescription: "Buttslap image with different target options",
    category: "funny",
    guide: {
      en: "   {pn} @tag/uid/reply/link"
    }
  },

  langs: {
    vi: {
      noTarget: ""
    },
    en: {
      noTarget: "You must provide a target user by tagging, ID, replying",
      invalidTarget: "Invalid target! Please provide a valid user tag, ID, reply",     
      error: "An error occurred while creating the image"
    }
  },

  onStart: async function ({ api, event, message, usersData, args, getLang }) {
    const uid1 = event.senderID;
    let uid2 = null;
    let content = args.join(' ');

    try {
      // Method 1: Check for mentions (@tag)
      if (Object.keys(event.mentions).length > 0) {
        uid2 = Object.keys(event.mentions)[0];
        content = content.replace(event.mentions[uid2], "").trim();
      }
      // Method 2: Check for reply context
      else if (event.messageReply && event.messageReply.senderID) {
        uid2 = event.messageReply.senderID;
      }
      // Method 3: Check for user ID in args
      else if (args[0] && /^\d+$/.test(args[0])) {
        uid2 = args[0];
        content = args.slice(1).join(' ').trim();
      }
      // Method 4: Check for profile link
      else if (args[0] && args[0].includes("facebook.com")) {
        const extractedId = extractFacebookId(args[0]);
        if (extractedId) {
          uid2 = extractedId;
          content = args.slice(1).join(' ').trim();
        }
      }

      if (!uid2) {
        return message.reply(getLang("noTarget"));
      }

      // Verify the user exists
      try {
        await usersData.getName(uid2);
      } catch (e) {
        return message.reply(getLang("invalidTarget"));
      }

      api.setMessageReaction("🐸", event.messageID, () => {}, true);
      const avatarURL1 = await usersData.getAvatarUrl(uid1);
      const avatarURL2 = await usersData.getAvatarUrl(uid2);
      
      const img = await new DIG.Spank().getImage(avatarURL1, avatarURL2);
      const pathSave = `${__dirname}/tmp/${uid1}_${uid2}spank.png`;
      fs.writeFileSync(pathSave, Buffer.from(img));
      
      message.reply({
        body: `${(content || "hehe 🐸🐸")}`,
        attachment: fs.createReadStream(pathSave)
      }, () => fs.unlinkSync(pathSave));
    } catch (error) {
      console.error(error);
      return message.reply(getLang("error"));
    }
  }
};

// Helper function to extract Facebook ID from profile link
function extractFacebookId(url) {
  try {
    // Handle facebook.com/profile.php?id=100000123456789
    if (url.includes("profile.php?id=")) {
      const match = url.match(/profile\.php\?id=(\d+)/);
      if (match && match[1]) return match[1];
    }
    
    // Handle facebook.com/username or facebook.com/user.name.123
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    
    // If it's a numeric ID directly
    if (/^\d+$/.test(lastPart)) {
      return lastPart;
    }
    
    // For usernames, we'll need to use the API to get the ID
    // This is a simplified approach and might need adjustment
    // based on your bot's API capabilities
    return null;
  } catch (e) {
    console.error("Error extracting Facebook ID:", e);
    return null;
  }
}