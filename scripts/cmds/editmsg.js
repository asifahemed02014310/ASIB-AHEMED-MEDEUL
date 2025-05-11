module.exports = {
  config: {
    name: "editmsg",
    aliases: ["em","edit","m"],
    version: "1.1",
    author: "𝗦𝗵𝗔𝗻", // DO NOT CHANGE AUTHOR INFORMATION
    role: 2,
    shortDescription: "Edit bot's messages",
    longDescription: "Edit a bot's message by replying to it with the command and new text.",
    category: "Group",
    guide: {
      en: "To use: reply to a bot's message with 'edit <new_message>'"
    }
  },

  onStart: async function ({ api, event, args }) {
    
    if (!event.messageReply) {
      return api.sendMessage("❌ You need to reply to the bot's message that you want to edit.", event.threadID, event.messageID);
    }

    if (event.messageReply.senderID != api.getCurrentUserID()) {
      return api.sendMessage("❌ You can only edit messages sent by the bot.", event.threadID, event.messageID);
    }

    if (args.length === 0) {
      return api.sendMessage("❌ Please provide the new message content.", event.threadID, event.messageID);
    }

    const newMessage = args.join(" ");

    try {
      await api.editMessage(newMessage, event.messageReply.messageID);
      
    } 
    catch (error) {
      console.error("Error editing message:", error);
      api.sendMessage("❌ Failed to edit the message. It may be too old or you don't have permission.", event.threadID);
    }
  }
};
