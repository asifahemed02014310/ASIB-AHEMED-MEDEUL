module.exports = {
  config: {
    name: "clear",
    aliases: [],
    author: "kshitiz updated by nur",  
    version: "2.0",
    cooldowns: 5,
    role: 0,
    shortDescription: {
      en: "Clear bot messages"
    },
    longDescription: {
      en: "Unsend all messages sent by bot"
    },
    category: "owner",
    guide: {
      en: "{p}{n}"
    }
  },
  onStart: async function ({ api, event }) {
    try {
      const threadID = event.threadID;
      const messageID = event.messageID;
      let successCount = 0;
      let failCount = 0;

      // React with 💢 to indicate start
      await api.setMessageReaction("💢", messageID, (err) => {
        if (err) console.log("Failed to react:", err);
      });

      // Get thread history with error handling
      let botMessages;
      try {
        botMessages = await api.getThreadHistory(threadID, 50);
      } catch (error) {
        // Keep the 💢 reaction if failed
        return;
      }

      // Filter bot messages
      const botSentMessages = botMessages.filter(message => 
        message.senderID === api.getCurrentUserID()
      );

      if (botSentMessages.length === 0) {
        // Change to ❤️‍🔥 if no messages to clear
        await api.setMessageReaction("❤️‍🔥", messageID, (err) => {
          if (err) console.log("Failed to react:", err);
        });
        return;
      }

      // Unsend messages with individual error handling
      for (const msg of botSentMessages) {
        try {
          await api.unsendMessage(msg.messageID);
          successCount++;
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failCount++;
          console.log(`Failed to unsend message ${msg.messageID}:`, error.message);
          
          // Continue with other messages even if one fails
          continue;
        }
      }

      // Change reaction to ❤️‍🔥 when finished
      await api.setMessageReaction("❤️‍🔥", messageID, (err) => {
        if (err) console.log("Failed to react:", err);
      });

    } catch (error) {
      console.error("Clear command error:", error);
      // Keep the 💢 reaction if there's an error
    }
  }
};
