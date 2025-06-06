module.exports = {
  config: {
    name: "respect",
    aliases: ["gcadmin"],
    version: "1.0",
    author: "NuR",
    countDown: 0,
    role: 0,
    shortDescription: "Give admin and show respect",
    longDescription: "Gives admin privileges in the thread and shows a respectful message.",
    category: "owner",
    guide: "{pn} respect",
  },

  onStart: async function ({ message, args, api, event }) {
    try {
      console.log('Sender ID:', event.senderID);
      console.log('Thread ID:', event.threadID);

      // Check if sender is owner
      const permission = global.GoatBot.config.ownerBot;
      if (!permission.includes(event.senderID)) {
        return api.sendMessage(
          "(\/)\ •_•)\/ >🧠\nYou Drop This Dumb Ass",
          event.threadID,
          event.messageID
        );
      }

      const threadID = event.threadID;
      const adminID = event.senderID;
      
      // Check if bot has admin permissions first
      const threadInfo = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();
      
      const botIsAdmin = threadInfo.adminIDs.some(admin => 
        admin.id === botID || admin.userID === botID
      );
      
      if (!botIsAdmin) {
        return api.sendMessage(
          "My Lord, I need to be an admin first to make you an admin! 😓",
          threadID,
          event.messageID
        );
      }

      // Check if user is already an admin
      const userIsAdmin = threadInfo.adminIDs.some(admin => 
        admin.id === adminID || admin.userID === adminID
      );
      
      if (userIsAdmin) {
        return api.sendMessage(
          "My Boss, you are already an admin! I respect you from my core of heart 🥰",
          threadID,
          event.messageID
        );
      }
      
      // Try to change the user to an admin
      await api.changeAdminStatus(threadID, adminID, true);

      // Send success message
      api.sendMessage(
        "My Boss, I respect you from my core of heart 🥰\nYou have been promoted to admin! 👑",
        threadID,
        event.messageID
      );

    } catch (error) {
      console.error("Error in respect command:", error);
      
      // More specific error handling
      if (error.message && error.message.includes('permission')) {
        api.sendMessage(
          "My Lord, I don't have permission to make you admin in this group. 😓",
          threadID,
          event.messageID
        );
      } else if (error.message && error.message.includes('already')) {
        api.sendMessage(
          "My Boss, you might already be an admin! 🥰",
          threadID,
          event.messageID
        );
      } else {
        api.sendMessage(
          "My Lord, I can't add you as an admin in this group right now. 😓\nError: " + (error.message || "Unknown error"),
          threadID,
          event.messageID
        );
      }
    }
  },
};
