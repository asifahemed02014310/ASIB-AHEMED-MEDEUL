const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "join",
    version: "2.7",
    author: "𝗦𝗵𝗔𝗻",
    countDown: 5,
    role: 2,
    shortDescription: "Join/leave groups with pagination",
    longDescription: "View and manage groups the bot is in with page navigation",
    category: "Owner",
    guide: {
      en: "{p}join [page] - View groups\nReply with number to join\nReply 'out [number]' to remove bot\nReply 'page [number]' to navigate"
    },
  },

  onStart: async function ({ api, event, args }) {
    try {
      const page = parseInt(args[0]) || 1;
      const groupList = await api.getThreadList(100, null, ['INBOX']);
      
      if (!groupList || groupList.length === 0) {
        return api.sendMessage('❌ No group chats found.', event.threadID);
      }

      const filteredGroups = groupList.filter(group => group.isGroup);
      await this.showGroupPage(api, event, filteredGroups, page);

    } catch (error) {
      console.error("Error in join command:", error);
      api.sendMessage('❌ An error occurred. Please try again later.', event.threadID);
    }
  },

  showGroupPage: async function (api, event, groups, page) {
    const itemsPerPage = 10;
    const totalPages = Math.ceil(groups.length / itemsPerPage);
    
    if (page < 1 || page > totalPages) {
      return api.sendMessage(`⚠️ Invalid page number. Please choose between 1 and ${totalPages}`, event.threadID);
    }

    const startIdx = (page - 1) * itemsPerPage;
    const pageGroups = groups.slice(startIdx, startIdx + itemsPerPage);

    const formattedList = pageGroups.map((group, index) => {
      const groupName = group.threadName || "𝗨𝗻𝗻𝗮𝗺𝗲𝗱 𝗚𝗿𝗼𝘂𝗽";
      const memberCount = group.participantIDs?.length || "Unknown";
      const isMember = group.participantIDs?.includes(event.senderID);
      
      return `[${startIdx + index + 1}] ${groupName}
  ┣ 𝗜𝗗: ${group.threadID}
  ┣ 𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${memberCount}
  ┗ 𝗬𝗼𝘂𝗿 𝗦𝘁𝗮𝘁𝘂𝘀: ${isMember ? "✅ Joined" : "❌ Not Joined"}`;
    });

    if (!global.joinCommandData) global.joinCommandData = {};
    global.joinCommandData[event.senderID] = groups;

    const message = `📋 𝗚𝗿𝗼𝘂𝗽 𝗟𝗶𝘀𝘁 (Page ${page}/${totalPages})\n\n` +
      formattedList.join("\n\n") +
      `\n\n𝗥𝗲𝗽𝗹𝘆 𝘄𝗶𝘁𝗵:\n` +
      `• Number to join that group (e.g. 1)\n` +
      `• 'out [number]' to remove bot (e.g. out 1)\n` +
      `• 'page [number]' to navigate (e.g. page 2)\n` +
      `• 'cancel' to exit this menu`;

    await api.sendMessage(message, event.threadID, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID,
        groups: groups,
        currentPage: page,
        totalPages: totalPages,
        type: "groupSelection"
      });
      
      setTimeout(() => {
        if (global.GoatBot.onReply.has(info.messageID)) {
          global.GoatBot.onReply.delete(info.messageID);
          delete global.joinCommandData[event.senderID];
        }
      }, 300000);
    });
  },

  onReply: async function ({ api, event, Reply, args }) {
    try {
      const { author, messageID, type, groups, currentPage, totalPages } = Reply;
      
      if (event.senderID !== author) {
        return api.sendMessage("⛔ This menu is not for you.", event.threadID);
      }

      const input = args.join(" ").trim().toLowerCase();

      if (input === 'cancel') {
        global.GoatBot.onReply.delete(messageID);
        delete global.joinCommandData[author];
        return api.sendMessage("❌ Command canceled.", event.threadID);
      }

      if (type === "groupSelection") {
        if (input.startsWith("page ")) {
          const newPage = parseInt(input.split(" ")[1]);
          if (isNaN(newPage) || newPage < 1 || newPage > totalPages) {
            return api.sendMessage(`⚠️ Invalid page number. Please choose between 1 and ${totalPages}`, event.threadID);
          }
          global.GoatBot.onReply.delete(messageID);
          return this.showGroupPage(api, event, groups, newPage);
        }
        
        if (input.startsWith("out ")) {
          const groupNum = parseInt(input.split(" ")[1]);
          if (isNaN(groupNum) || groupNum < 1 || groupNum > groups.length) {
            return api.sendMessage("⚠️ Invalid group number.", event.threadID);
          }
          await this.confirmLeave(api, event, groups[groupNum - 1]);
          global.GoatBot.onReply.delete(messageID);
          delete global.joinCommandData[author];
          return;
        }
        
        const groupNum = parseInt(input);
        if (isNaN(groupNum) || groupNum < 1 || groupNum > groups.length) {
          return api.sendMessage(`⚠️ Please reply with:\n- A valid group number\n- 'out [number]' to remove bot\n- 'page [number]' to navigate\n- 'cancel' to exit`, event.threadID);
        }
        
        await this.joinGroup(api, event, groups[groupNum - 1]);
        global.GoatBot.onReply.delete(messageID);
        delete global.joinCommandData[author];
      }
      else if (type === "leaveConfirmation") {
        await this.handleLeaveConfirmation({ api, event, Reply, args });
      }

    } catch (error) {
      console.error("Reply handler error:", error);
      api.sendMessage('❌ Failed to process your reply.', event.threadID);
    }
  },

  joinGroup: async function (api, event, group) {
    try {
      const groupID = group.threadID;
      const groupName = group.threadName || "Unnamed Group";
      const userID = event.senderID;

      const threadInfo = await api.getThreadInfo(groupID);
      if (threadInfo.participantIDs.includes(userID)) {
        return api.sendMessage(`ℹ️ You're already in "${groupName}"`, event.threadID);
      }

      if (threadInfo.participantIDs.length >= 250) {
        return api.sendMessage(`⚠️ "${groupName}" is full (250/250 members)`, event.threadID);
      }

      await api.addUserToGroup(userID, groupID);
      return api.sendMessage(`✅ Successfully joined "${groupName}"`, event.threadID);

    } catch (error) {
      console.error("Join error:", error);
      
      let errorMessage = `❌ Failed to join group.`;
      if (error.errorDescription) {
        if (error.errorDescription.includes("permission")) {
          errorMessage += "\nBot lacks permission to add members.";
        } else if (error.errorDescription.includes("approval")) {
          errorMessage += "\nJoin request sent - waiting for admin approval.";
        } else if (error.errorDescription.includes("friend")) {
          errorMessage += "\nYou need to be friends with the bot first.";
        }
      }

      api.sendMessage(errorMessage, event.threadID);
    }
  },

  confirmLeave: async function (api, event, group) {
    try {
      const groupName = group.threadName || "Unnamed Group";
      const groupID = group.threadID;
      
      const threadInfo = await api.getThreadInfo(groupID);
      if (!threadInfo.participantIDs.includes(api.getCurrentUserID())) {
        return api.sendMessage(`ℹ️ The bot is not in "${groupName}"`, event.threadID);
      }

      const confirmMessage = await api.sendMessage(
        `⚠️ Are you sure you want to remove the bot from "${groupName}"?\n` +
        `Reply "yes" to confirm or "no" to cancel.`,
        event.threadID
      );

      global.GoatBot.onReply = global.GoatBot.onReply || new Map();
      global.GoatBot.onReply.set(confirmMessage.messageID, {
        commandName: this.config.name,
        messageID: confirmMessage.messageID,
        author: event.senderID,
        groupID: groupID,
        groupName: groupName,
        type: "leaveConfirmation"
      });

      setTimeout(() => {
        if (global.GoatBot.onReply.has(confirmMessage.messageID)) {
          global.GoatBot.onReply.delete(confirmMessage.messageID);
          api.sendMessage("⌛ Confirmation timed out.", event.threadID);
        }
      }, 120000);

    } catch (error) {
      console.error("Confirm leave error:", error);
      api.sendMessage('❌ Failed to process leave request.', event.threadID);
    }
  },

  handleLeaveConfirmation: async function ({ api, event, Reply, args }) {
    try {
      const { author, groupID, groupName, messageID } = Reply;
      const response = args.join(" ").toLowerCase();

      if (response !== "yes" && response !== "no") {
        return api.sendMessage("⚠️ Please reply with 'yes' or 'no'.", event.threadID);
      }

      if (response === "yes") {
        await api.sendMessage(`I'm leaving at my owner's request.👋`, groupID);
        await api.sendMessage(`🚫 Bot is leaving "${groupName}"...`, event.threadID);
        
        await api.removeUserFromGroup(api.getCurrentUserID(), groupID);
        
        try {
          await api.sendMessage(`✅ Bot has been removed from "${groupName}"`, event.threadID);
        } catch (e) {
          console.log("Final confirmation failed - bot was removed successfully");
        }
      } else {
        await api.sendMessage(`❌ Removal of bot from "${groupName}" was canceled.`, event.threadID);
      }

      if (global.GoatBot.onReply.has(messageID)) {
        global.GoatBot.onReply.delete(messageID);
      }

    } catch (error) {
      console.error("Leave confirmation error:", error);
      
      let errorMessage = '❌ Failed to remove bot from group.';
      if (error.errorDescription) {
        if (error.errorDescription.includes("permission")) {
          errorMessage += "\nBot lacks permission to leave the group.";
        } else if (error.errorDescription.includes("not in group")) {
          errorMessage += "\nBot is no longer in this group.";
        }
      }
      
      api.sendMessage(errorMessage, event.threadID);
      
      if (global.GoatBot.onReply.has(Reply.messageID)) {
        global.GoatBot.onReply.delete(Reply.messageID);
      }
    }
  }
};
