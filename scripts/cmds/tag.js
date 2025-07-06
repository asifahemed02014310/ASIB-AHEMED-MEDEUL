const config = {
  name: "tag",
  version: "1.0",
  author: "Hamim",
  countDown: 10,
  role: 1,
  description: {
    en: "Tag all members with a matching name or reply to someone"
  },
  guide: {
    en: "{pn} [name] [text] | Reply to someone to tag them"
  },
  category: "Group",
};

const onStart = async ({ api, args, event }) => {
    try {
        let targetID = null;
        let searchQuery = "";

        if (event.messageReply?.senderID) {
            targetID = event.messageReply.senderID;
            searchQuery = args.join(" ");
        }
        else if (args[0] && args[0].startsWith("@")) {
            targetID = args[0].replace("@", "");
            searchQuery = args.slice(1).join(" ");
        }
        else if (args.length > 0) {
            const searchName = args[0].toLowerCase();

            const threadInfo = await api.getThreadInfo(event.threadID);
            

            for (const participant of threadInfo.participantIDs) {
                const userInfo = await api.getUserInfo(participant);
                if (userInfo && userInfo[participant]) {
                    const userName = userInfo[participant].name.toLowerCase();
                    const userNickname = threadInfo.nicknames && threadInfo.nicknames[participant] 
                        ? threadInfo.nicknames[participant].toLowerCase() 
                        : "";

                    if (userName.includes(searchName) || userNickname.includes(searchName)) {
                        targetID = participant;
                        searchQuery = args.slice(1).join(" ");
                        break;
                    }
                }
            }
            
            if (!targetID) {
                return api.sendMessage(`No user found with name or nickname containing "${args[0]}"`, event.threadID, event.messageID);
            }
        }
        else {
            targetID = event.senderID;
        }

        const mentionedUser = await api.getUserInfo(targetID);
        if (mentionedUser && mentionedUser[targetID]) {
            const userName = mentionedUser[targetID].name;
            const messageText = searchQuery ? `${userName} ${searchQuery}` : userName;
            
            await api.sendMessage({
                body: messageText,
                mentions: [{
                    tag: userName,
                    id: targetID
                }]
            }, event.threadID, event.messageID);
        } else {
            api.sendMessage("User not found or invalid ID", event.threadID, event.messageID);
        }
    } catch (error) {
        console.log(error);
        api.sendMessage(`Error: ${error.message}`, event.threadID, event.messageID);
    }
};

module.exports = {
    config,
    onStart,
    run: onStart
};
