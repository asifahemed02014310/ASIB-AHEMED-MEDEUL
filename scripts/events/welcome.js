const { getTime, drive } = global.utils;
if (!global.temp.welcomeEvent)
  global.temp.welcomeEvent = {};

module.exports = {
  config: {
    name: "welcome",
    version: "1.7",
    author: "Nur",
    category: "events"
  },

  langs: {
    
    en: {
      session1: "𝗠𝗼𝗿𝗻𝗶𝗻𝗴",
      session2: "𝗡𝗼𝗼𝗻",
      session3: "𝗔𝗳𝘁𝗲𝗿𝗻𝗼𝗼𝗻",
      session4: "𝗘𝘃𝗲𝗻𝗶𝗻𝗴",
      session5: "𝗡𝗶𝗴𝗵𝘁",
      welcomeMessage: `𝗔𝘀𝘀𝗮𝗹𝗮𝗺𝘂𝗮𝗹𝗮𝗶𝗸𝘂𝗺.🖤!\n`
        + `\n💥 𝗜'𝗺 𝗩𝗜𝗫𝗔, 𝗔 𝗕𝗼𝘁,`
        + `\n💥  𝗧𝗵𝗮𝗻𝗸𝘀 𝗳𝗼𝗿 𝗶𝗻𝘃𝗶𝘁𝗶𝗻𝗴 𝗺𝗲!`
        + `\n💥 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿/𝗼𝘄𝗻𝗲𝗿:https://www.facebook.com/access.denied.1233`,
      multiple1: "𝗧𝗼 𝗧𝗵𝗲 ",
      multiple2: "𝗧𝗼 𝗢𝘂𝗿",
      defaultWelcomeMessage: `✨ 𝗔𝘀𝘀𝗮𝗹𝗮𝗺𝘂𝗮𝗹𝗮𝗶𝗸𝘂𝗺..🖤\n`
        + `\n𝗛𝗲𝗹𝗹𝗼 {userName}`
        + `\n𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝗧𝗼 𝗢𝘂𝗿 𝗚𝗿𝗼𝘂𝗽`
        + `\n𝗛𝗮𝘃𝗲 𝗮 𝗴𝗼𝗼𝗱 𝗱𝗮𝘆 💖🥰`
    }
  },

  onStart: async ({ threadsData, message, event, api, getLang }) => {
    if (event.logMessageType == "log:subscribe") {
      const hours = getTime("HH");
      const { threadID } = event;
      const { nickNameBot } = global.GoatBot.config;
      const prefix = global.utils.getPrefix(threadID);
      const dataAddedParticipants = event.logMessageData.addedParticipants;

      if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
        if (nickNameBot)
          api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
        return message.send(getLang("welcomeMessage", prefix));
      }

      if (!global.temp.welcomeEvent[threadID])
        global.temp.welcomeEvent[threadID] = {
          joinTimeout: null,
          dataAddedParticipants: []
        };

      global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
      clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

      global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
        try {
          const threadData = await threadsData.get(threadID);
          if (threadData.settings.sendWelcomeMessage == false)
            return;

          const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
          const dataBanned = threadData.data.banned_ban || [];
          const threadName = threadData.threadName;
          const userName = [];
          const mentions = [];
          let multiple = false;

          if (dataAddedParticipants.length > 1)
            multiple = true;

          for (const user of dataAddedParticipants) {
            if (dataBanned.some((item) => item.id == user.userFbId))
              continue;
            userName.push(user.fullName);
            mentions.push({ tag: user.fullName, id: user.userFbId });
          }

          if (userName.length == 0) return;

          let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;
          const form = {
            mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null
          };

          welcomeMessage = welcomeMessage
            .replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
            .replace(/\{boxName\}|\{threadName\}/g, threadName)
            .replace(
              /\{multiple\}/g,
              multiple ? getLang("multiple2") : getLang("multiple1")
            )
            .replace(
              /\{session\}/g,
              hours <= 10
                ? getLang("session1")
                : hours <= 12
                  ? getLang("session2")
                  : hours <= 18
                    ? getLang("session3")
                    : hours <= 21
                      ? getLang("session4")
                      : getLang("session5")
            );

          form.body = welcomeMessage;

          if (threadData.data.welcomeAttachment) {
            const files = threadData.data.welcomeAttachment;
            const attachments = files.map(file => drive.getFile(file, "stream"));
            const results = await Promise.allSettled(attachments);
            form.attachment = results
              .filter(({ status }) => status === "fulfilled")
              .map(({ value }) => value);
          }

          message.send(form);
          delete global.temp.welcomeEvent[threadID];
        } catch (err) {
          console.error("Welcome event error:", err);
        }
      }, 1500);
    }
  }
};
