const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];

function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
    const adminBot = global.GoatBot.config?.adminBot || [];
    const ownerBot = global.GoatBot.config?.ownerBot || [];
    
    if (!senderID) return 0;
        
    const adminBox = threadData?.adminIDs || [];
    
    if (ownerBot.includes(senderID)) return 3;
    else if (adminBot.includes(senderID)) return 2;
    else if (adminBox.includes(senderID)) return 1;
    else return 0;
}

function getText(type, reason, time, targetID, lang) {
    const utils = global.utils;
    switch(type) {
        case "userBanned":
            return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        case "threadBanned":
            return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        case "onlyAdminBox":
            return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        case "onlyAdminBot":
            return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
        default:
            return "";
    }
}

function replaceShortcutInLang(text, prefix, commandName) {
    return text
        .replace(/\{(?:p|prefix)\}/g, prefix)
        .replace(/\{(?:n|name)\}/g, commandName)
        .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
    if (!command?.config) return { 
        onStart: 0, 
        onChat: 0, 
        onReaction: 0, 
        onReply: 0 
    };

    let roleConfig;
    if (utils.isNumber(command.config.role)) {
        roleConfig = { onStart: command.config.role };
    }
    else if (typeof command.config.role === "object" && !Array.isArray(command.config.role)) {
        roleConfig = { onStart: 0, ...command.config.role };
    }
    else {
        roleConfig = { onStart: 0 };
    }

    if (isGroup) {
        roleConfig.onStart = threadData?.data?.setRole?.[commandName] ?? roleConfig.onStart;
    }

    ["onChat", "onStart", "onReaction", "onReply"].forEach(key => {
        roleConfig[key] = roleConfig[key] ?? roleConfig.onStart;
    });

    return roleConfig;
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
    const config = global.GoatBot.config || {};
    const { adminBot = [], hideNotiMessage = {} } = config;

    if (userData?.banned?.status) {
        const { reason, date } = userData.banned;
        if (!hideNotiMessage.userBanned) {
            message.reply(getText("userBanned", reason, date, senderID, lang));
        }
        return true;
    }

    if (config.adminOnly?.enable && 
        !adminBot.includes(senderID) && 
        !config.adminOnly.ignoreCommand?.includes(commandName)) {
        if (!hideNotiMessage.adminOnly) {
            message.reply(getText("onlyAdminBot", null, null, null, lang));
        }
        return true;
    }

    if (config.ownerOnly?.enable && 
        !config.ownerBot?.includes(senderID) && 
        !config.adminOnly.ignoreCommand?.includes(commandName)) {
        message.reply(getText("onlyOwnerBot", null, null, null, lang));
        return true;
    }

    if (isGroup) {
        if (threadData?.data?.onlyAdminBox && 
            !threadData.adminIDs?.includes(senderID) && 
            !threadData.data.ignoreCommanToOnlyAdminBox?.includes(commandName)) {
            if (!threadData.data.hideNotiMessageOnlyAdminBox) {
                message.reply(getText("onlyAdminBox", null, null, null, lang));
            }
            return true;
        }

        if (threadData?.banned?.status) {
            const { reason, date } = threadData.banned;
            if (!hideNotiMessage.threadBanned) {
                message.reply(getText("threadBanned", reason, date, threadID, lang));
            }
            return true;
        }
    }
    return false;
}

function createGetText2(langCode, pathCustomLang, prefix, command) {
    const commandName = command?.config?.name || "unknown";
    let customLang = {};
    
    if (fs.existsSync(pathCustomLang)) {
        try {
            customLang = require(pathCustomLang)[commandName]?.text || {};
        } catch (error) {}
    }

    return function (key, ...args) {
        let lang = command?.langs?.[langCode]?.[key] || customLang[key] || "";
        lang = replaceShortcutInLang(lang, prefix, commandName);
        args.forEach((arg, index) => {
            lang = lang.replace(new RegExp(`%${index + 1}`, "g"), arg);
        });
        return lang || `❌ Missing translation for "${key}" in ${commandName}`;
    };
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
    return async function (event, message) {
        const { utils, client, GoatBot } = global;
        const { getPrefix, removeHomeDir, log, getTime } = utils;
        const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
        const { autoRefreshThreadInfoFirstTime } = config?.database || {};
        let { hideNotiMessage = {} } = config;

        const { body, messageID, threadID, isGroup } = event;
        if (!threadID) return;

        const senderID = event.userID || event.senderID || event.author;
        let threadData = global.db.allThreadData?.find(t => t.threadID == threadID);
        let userData = global.db.allUserData?.find(u => u.userID == senderID);

        if (!userData && !isNaN(senderID)) {
            userData = await usersData.create(senderID);
        }

        if (!threadData && !isNaN(threadID)) {
            if (!global.temp.createThreadDataError?.includes(threadID)) {
                threadData = await threadsData.create(threadID);
                global.db.receivedTheFirstMessage[threadID] = true;
            }
        } else if (autoRefreshThreadInfoFirstTime && !global.db.receivedTheFirstMessage?.[threadID]) {
            global.db.receivedTheFirstMessage[threadID] = true;
            await threadsData.refreshInfo(threadID);
        }

        if (typeof threadData?.settings?.hideNotiMessage === "object") {
            hideNotiMessage = { ...hideNotiMessage, ...threadData.settings.hideNotiMessage };
        }

        const prefix = getPrefix(threadID);
        const role = getRole(threadData, senderID);
        const langCode = threadData?.data?.lang || config?.language || "en";

        const parameters = {
            api, 
            usersData, 
            threadsData, 
            message, 
            event,
            userModel, 
            threadModel, 
            prefix, 
            dashBoardModel,
            globalModel, 
            dashBoardData, 
            globalData, 
            envCommands,
            envEvents, 
            envGlobal, 
            role,
            removeCommandNameFromBody: function (body_, prefix_, commandName_) {
                if ([body_, prefix_, commandName_].some(x => nullAndUndefined.includes(x))) {
                    throw new Error("Missing required parameters for removeCommandNameFromBody");
                }
                return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
            }
        };

        function createMessageSyntaxError(commandName) {
            message.SyntaxError = async () => {
                return message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
            };
        }

        async function onStart() {
            if (!body?.startsWith(prefix)) return;
            
            const dateNow = Date.now();
            const args = body.slice(prefix.length).trim().split(/ +/);
            let commandName = args.shift()?.toLowerCase();
            if (!commandName) return;

            let command = GoatBot.commands.get(commandName) || 
                         GoatBot.commands.get(GoatBot.aliases?.get(commandName));

            const aliasesData = threadData?.data?.aliases || {};
            for (const [cmdName, aliases] of Object.entries(aliasesData)) {
                if (aliases.includes(commandName)) {
                    command = GoatBot.commands.get(cmdName);
                    break;
                }
            }

            if (!command?.config) return;
            commandName = command.config.name;

            if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode)) {
                return;
            }

            const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
            const needRole = roleConfig.onStart;

            if (needRole > role) {
                if (!hideNotiMessage.needRoleToUseCmd) {
                    const errorMessages = {
                        1: "onlyAdmin",
                        2: "onlyAdminBot2",
                        3: "onlyOwnerBot"
                    };
                    if (errorMessages[needRole]) {
                        await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, errorMessages[needRole], commandName));
                    }
                }
                return;
            }

            const timestamps = client.countDown[commandName] || {};
            const cooldown = (command.config.countDown || 1) * 1000;
            
            if (timestamps[senderID] && Date.now() < timestamps[senderID] + cooldown) {
                const remaining = ((timestamps[senderID] + cooldown - Date.now()) / 1000).toFixed(1);
                return message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "waitingForCommand", remaining));
            }

            try {
                const analytics = await globalData.get("analytics", "data", {});
                analytics[commandName] = (analytics[commandName] || 0) + 1;
                await globalData.set("analytics", analytics, "data");

                createMessageSyntaxError(commandName);
                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                
                await command.onStart({
                    ...parameters,
                    args,
                    commandName,
                    getLang: getText2,
                    removeCommandNameFromBody: parameters.removeCommandNameFromBody
                });

                timestamps[senderID] = Date.now();
                client.countDown[commandName] = timestamps;
                log.info("CMD EXEC", `${commandName} | ${userData.name} | ${senderID} | ${threadID}`);
                
            } catch (err) {
                log.error("CMD ERROR", `${commandName}: ${err.message}`);
                const errorDetails = err.stack?.split("\n").slice(0, 5).join("\n") || err.toString();
                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred", getTime("DD/MM/YYYY HH:mm:ss"), commandName, removeHomeDir(errorDetails)));
            }
        }

        async function onChat() {
            const allOnChat = GoatBot.onChat || [];
            const args = body ? body.split(/ +/) : [];
            
            for (const key of allOnChat) {
                const command = GoatBot.commands.get(key);
                if (!command?.config) continue;
                
                const commandName = command.config.name;
                const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                if (roleConfig.onChat > role) continue;

                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                const time = getTime("DD/MM/YYYY HH:mm:ss");
                
                try {
                    createMessageSyntaxError(commandName);
                    await command.onChat({
                        ...parameters,
                        isUserCallCommand,
                        args,
                        commandName,
                        getLang: getText2
                    });
                    log.info("ON CHAT", `${commandName} | ${userData.name} | ${threadID}`);
                } catch (err) {
                    log.error("CHAT ERROR", `${commandName}: ${err.message}`);
                    await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack?.split("\n").slice(0, 5).join("\n") || err.toString())));
                }
            }
        }

        async function onReply() {
            if (!event.messageReply) return;
            const { onReply } = GoatBot;
            const Reply = onReply.get(event.messageReply.messageID);
            if (!Reply) return;

            Reply.delete = () => onReply.delete(messageID);
            const commandName = Reply.commandName;
            if (!commandName) {
                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                return log.error("REPLY ERR", "Missing command name", Reply);
            }

            const command = GoatBot.commands.get(commandName);
            if (!command) {
                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                return log.error("REPLY ERR", `Command ${commandName} not found`);
            }

            const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
            if (roleConfig.onReply > role) {
                if (!hideNotiMessage.needRoleToUseCmdOnReply) {
                    const errorMessages = {
                        1: "onlyAdminToUseOnReply",
                        2: "onlyAdminBot2ToUseOnReply",
                        3: "onlyOwnerBotToUseOnReply"
                    };
                    if (errorMessages[roleConfig.onReply]) {
                        await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, errorMessages[roleConfig.onReply], commandName));
                    }
                }
                return;
            }

            try {
                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                const args = body ? body.split(/ +/) : [];
                
                createMessageSyntaxError(commandName);
                await command.onReply({
                    ...parameters,
                    Reply,
                    args,
                    commandName,
                    getLang: getText2
                });
                log.info("ON REPLY", `${commandName} | ${userData.name} | ${threadID}`);
            } catch (err) {
                log.error("REPLY ERR", `${commandName}: ${err.message}`);
                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred3", getTime("DD/MM/YYYY HH:mm:ss"), commandName, removeHomeDir(err.stack?.split("\n").slice(0, 5).join("\n") || err.toString())));
            }
        }

        async function onReaction() {
            const { onReaction } = GoatBot;
            const Reaction = onReaction.get(messageID);
            if (!Reaction) return;

            Reaction.delete = () => onReaction.delete(messageID);
            const commandName = Reaction.commandName;
            if (!commandName) {
                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                return log.error("REACTION ERR", "Missing command name");
            }

            const command = GoatBot.commands.get(commandName);
            if (!command) {
                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                return log.error("REACTION ERR", `Command ${commandName} not found`);
            }

            const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
            if (roleConfig.onReaction > role) {
                if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
                    const errorMessages = {
                        1: "onlyAdminToUseOnReaction",
                        2: "onlyAdminBot2ToUseOnReaction",
                        3: "onlyOwnerBotToUseOnReaction"
                    };
                    if (errorMessages[roleConfig.onReaction]) {
                        await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, errorMessages[roleConfig.onReaction], commandName));
                    }
                }
                return;
            }

            try {
                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                createMessageSyntaxError(commandName);
                await command.onReaction({
                    ...parameters,
                    Reaction,
                    commandName,
                    getLang: getText2
                });
                log.info("ON REACTION", `${commandName} | ${userData.name} | ${threadID}`);
            } catch (err) {
                log.error("REACTION ERR", `${commandName}: ${err.message}`);
                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred4", getTime("DD/MM/YYYY HH:mm:ss"), commandName, removeHomeDir(err.stack?.split("\n").slice(0, 5).join("\n") || err.toString())));
            }
        }

        return {
            onStart,
            onChat,
            onReply,
            onReaction,
            onAnyEvent: async () => {},
            onFirstChat: async () => {},
            onEvent: async () => {},
            presence: async () => {},
            read_receipt: async () => {},
            typ: async () => {},
            handlerEvent: async () => {}
        };
    };
};
