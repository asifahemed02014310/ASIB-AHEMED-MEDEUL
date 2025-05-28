const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "clone",
    version: "1.0",
    author: "NUR",
    countDown: 5,
    role: 2,
    shortDescription: "Clone members from one group to another",
    longDescription: "Copy all members from a selected group and add them to the current group",
    category: "Owner",
    guide: {
      en: "{p}clone - View available groups to clone from\nReply with number to start cloning process"
    },
  },

  onStart: async function ({ api, event, args }) {
    try {
      // Check if command is used in a group
      if (!event.isGroup) {
        return api.sendMessage('❌ This command can only be used in group chats.', event.threadID);
      }

      const currentGroupID = event.threadID;
      const groupList = await api.getThreadList(100, null, ['INBOX']);
      
      if (!groupList || groupList.length === 0) {
        return api.sendMessage('❌ No group chats found.', event.threadID);
      }

      // Filter out the current group and only show groups where bot is a member
      const filteredGroups = groupList.filter(group => 
        group.isGroup && 
        group.threadID !== currentGroupID &&
        group.participantIDs && 
        group.participantIDs.includes(api.getCurrentUserID())
      );

      if (filteredGroups.length === 0) {
        return api.sendMessage('❌ No other groups available to clone from.', event.threadID);
      }

      await this.showAvailableGroups(api, event, filteredGroups, currentGroupID);

    } catch (error) {
      console.error("Error in clone command:", error);
      api.sendMessage('❌ An error occurred. Please try again later.', event.threadID);
    }
  },

  showAvailableGroups: async function (api, event, groups, currentGroupID) {
    try {
      const formattedList = groups.map((group, index) => {
        const groupName = group.threadName || "𝗨𝗻𝗻𝗮𝗺𝗲𝗱 𝗚𝗿𝗼𝘂𝗽";
        const memberCount = group.participantIDs?.length || "Unknown";
        
        return `${index + 1}. ${groupName} | 🆔 ${group.threadID} | 👥 ${memberCount} members`;
      });

      const message = `📋 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗚𝗿𝗼𝘂𝗽𝘀 𝘁𝗼 𝗖𝗹𝗼𝗻𝗲 𝗙𝗿𝗼𝗺:\n\n` +
        formattedList.join("\n") +
        `\n\n➡️ Reply with the number of the group to clone members from.\n` +
        `💡 Reply 'cancel' to exit this menu.`;

      const sentMessage = await api.sendMessage(message, event.threadID);

      global.GoatBot.onReply = global.GoatBot.onReply || new Map();
      global.GoatBot.onReply.set(sentMessage.messageID, {
        commandName: this.config.name,
        messageID: sentMessage.messageID,
        author: event.senderID,
        groups: groups,
        currentGroupID: currentGroupID,
        type: "groupSelection"
      });
      
      // Auto-cleanup after 5 minutes
      setTimeout(() => {
        if (global.GoatBot.onReply.has(sentMessage.messageID)) {
          global.GoatBot.onReply.delete(sentMessage.messageID);
        }
      }, 300000);

    } catch (error) {
      console.error("Show groups error:", error);
      api.sendMessage('❌ Failed to display group list.', event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply, args }) {
    try {
      const { author, messageID, type, groups, currentGroupID } = Reply;
      
      if (event.senderID !== author) {
        return api.sendMessage("⛔ This menu is not for you.", event.threadID);
      }

      const input = args.join(" ").trim().toLowerCase();

      if (input === 'cancel') {
        global.GoatBot.onReply.delete(messageID);
        return api.sendMessage("❌ Clone command canceled.", event.threadID);
      }

      if (type === "groupSelection") {
        const groupNum = parseInt(input);
        if (isNaN(groupNum) || groupNum < 1 || groupNum > groups.length) {
          return api.sendMessage(`⚠️ Invalid group number. Please choose between 1 and ${groups.length}, or reply 'cancel' to exit.`, event.threadID);
        }
        
        const selectedGroup = groups[groupNum - 1];
        await this.startCloning(api, event, selectedGroup, currentGroupID);
        global.GoatBot.onReply.delete(messageID);
      }

    } catch (error) {
      console.error("Reply handler error:", error);
      api.sendMessage('❌ Failed to process your reply.', event.threadID);
    }
  },

  startCloning: async function (api, event, sourceGroup, targetGroupID) {
    try {
      const sourceGroupName = sourceGroup.threadName || "Unnamed Group";
      const sourceGroupID = sourceGroup.threadID;

      // Send initial message
      const statusMessage = await api.sendMessage(
        `🔄 Starting clone process...\n📂 Source: ${sourceGroupName}\n🎯 Target: Current Group\n\n⏳ Please wait...`,
        targetGroupID
      );

      // Get detailed info from source group
      const sourceThreadInfo = await api.getThreadInfo(sourceGroupID);
      const targetThreadInfo = await api.getThreadInfo(targetGroupID);
      
      const sourceMembers = sourceThreadInfo.participantIDs || [];
      const targetMembers = targetThreadInfo.participantIDs || [];
      const botID = api.getCurrentUserID();

      // Filter out members that are already in target group and the bot itself
      const membersToAdd = sourceMembers.filter(memberID => 
        !targetMembers.includes(memberID) && memberID !== botID
      );

      if (membersToAdd.length === 0) {
        return api.sendMessage(
          `ℹ️ No new members to clone.\nAll members from "${sourceGroupName}" are already in this group.`,
          targetGroupID
        );
      }

      let successCount = 0;
      let failCount = 0;
      const batchSize = 5; // Add members in small batches to avoid rate limits
      const delayBetweenBatches = 2000; // 2 seconds delay between batches

      // Process members in batches
      for (let i = 0; i < membersToAdd.length; i += batchSize) {
        const batch = membersToAdd.slice(i, i + batchSize);
        
        for (const memberID of batch) {
          try {
            await api.addUserToGroup(memberID, targetGroupID);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between individual adds
          } catch (error) {
            failCount++;
            console.log(`Failed to add user ${memberID}:`, error.message);
          }
        }

        // Update progress periodically
        if (i + batchSize < membersToAdd.length) {
          const progress = Math.round(((i + batchSize) / membersToAdd.length) * 100);
          await api.editMessage(
            `🔄 Cloning in progress... ${progress}%\n📂 Source: ${sourceGroupName}\n🎯 Target: Current Group\n\n✅ Added: ${successCount}\n❌ Failed: ${failCount}`,
            statusMessage.messageID
          );
          
          // Delay between batches
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      // Final status message
      const finalMessage = `✅ 𝗖𝗹𝗼𝗻𝗲 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲!\n\n` +
        `📂 𝗦𝗼𝘂𝗿𝗰𝗲: ${sourceGroupName}\n` +
        `👥 𝗧𝗼𝘁𝗮𝗹 𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${sourceMembers.length}\n` +
        `🟢 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗔𝗱𝗱𝗲𝗱: ${successCount}\n` +
        `🔴 𝗙𝗮𝗶𝗹𝗲𝗱 𝘁𝗼 𝗔𝗱𝗱: ${failCount}\n` +
        `ℹ️ 𝗔𝗹𝗿𝗲𝗮𝗱𝘆 𝗶𝗻 𝗚𝗿𝗼𝘂𝗽: ${targetMembers.length - 1}`; // -1 to exclude bot

      await api.editMessage(finalMessage, statusMessage.messageID);

    } catch (error) {
      console.error("Cloning error:", error);
      
      let errorMessage = `❌ Clone process failed.`;
      if (error.errorDescription) {
        if (error.errorDescription.includes("permission")) {
          errorMessage += "\n🚫 Bot lacks permission to add members to this group.";
        } else if (error.errorDescription.includes("rate limit")) {
          errorMessage += "\n⏱️ Rate limit exceeded. Please try again later.";
        }
      }
      
      api.sendMessage(errorMessage, event.threadID);
    }
  }
};
