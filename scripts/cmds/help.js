const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "1.18",
    author: "ShAn",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "View command usage",
    },
    longDescription: {
      en: "View command usage and list all commands or commands by category",
    },
    category: "info",
    guide: {
      en: "{pn} / help cmdName\n{pn} -c <categoryName>",
    },
    priority: 1,
  },

  onStart: async function ({ message, args, event, threadsData, role }) {
    const { threadID } = event;
    const threadData = await threadsData.get(threadID);
    const prefix = getPrefix(threadID);

    // If no argument is provided => show general commands (role 0) and ADMIN (role 1) separately.
    if (args.length === 0) {
      // Build general command list: Only role 0 commands are grouped by category.
      const categories = {};
      let msg = "";
      msg += `╔══════════╗\n🔰𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀\n╚══════════╝\n`;

      for (const [name, value] of commands) {
        // Only include commands with role 0 here.
        if (value.config.role !== 0) continue;
        let origCategory = value.config.category || "Uncategorized";
        let key = origCategory.toLowerCase();
        if (!categories[key]) {
          // Use a canonical name (all upper case) for displaying.
          categories[key] = { canonical: origCategory.toUpperCase(), commands: [] };
        }
        categories[key].commands.push(name);
      }

      Object.keys(categories).forEach((key) => {
        msg += `\n╭────────────⭓\n│『 ${categories[key].canonical} 』`;
        const names = categories[key].commands.sort();
        names.forEach((item) => {
          msg += `\n│⭕${item}`;
        });
        msg += `\n╰────────⭓`;
      });

      // Build ADMIN command list: Only include commands with role 1.
      const adminCommands = Array.from(commands.values())
        .filter((cmd) => cmd.config.role === 1)
        .map((cmd) => cmd.config.name)
        .sort((a, b) => a.localeCompare(b));

      if (adminCommands.length > 0) {
        msg += `\n\n╔══════════════╗\n🔰𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 \n╚══════════════╝\n`;
        adminCommands.forEach((cmdName) => {
          msg += `\n💥- ${cmdName}`;
        });
      }

      // Summary: Total commands, all user commands (role 0) and admin commands (role 1)
      const totalAll = commands.size;
      const totalGeneral = Array.from(commands.values()).filter(cmd => cmd.config.role === 0).length;
      const totalAdmin = Array.from(commands.values()).filter(cmd => cmd.config.role === 1).length;
      msg += `\n\n𝗧𝗼𝘁𝗮𝗹 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalAll}`;
      msg += `\n𝗔𝗹𝗹 𝘂𝘀𝗲𝗿 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalGeneral}`;
      msg += `\n𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalAdmin}`;
      
      msg += `\n\n𝗧𝘆𝗽𝗲 ${prefix}help 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗻𝗮𝗺𝗲 𝘁𝗼 𝘃𝗶𝗲𝘄 𝗨𝘀𝗮𝗴𝗲𝘀.!\n`;

      await message.reply({ body: msg });

    // If the user uses the "-c" flag for a category, handle accordingly.
    } else if (args[0] === "-c") {
      if (!args[1]) {
        await message.reply("Please specify a category name.");
        return;
      }
      const categoryName = args[1].toLowerCase();
      // For category filtering, we include all commands (regardless of role) matching the category.
      const filteredCommands = Array.from(commands.values()).filter(
        (cmd) => cmd.config.category?.toLowerCase() === categoryName
      );

      if (filteredCommands.length === 0) {
        await message.reply(`No commands found in the category "${args[1]}".`);
        return;
      }
      let msg = `╔══════════════╗\n🔹 ${args[1].toUpperCase()} COMMANDS 🔹\n╚══════════════╝\n`;
      filteredCommands.forEach((cmd) => {
        msg += `\n💠 ${cmd.config.name} 💠`;
      });
      await message.reply(msg);

    // If the user wants owner commands: /help o or /help owner
    } else if (args[0].toLowerCase() === "o" || args[0].toLowerCase() === "owner") {
      const ownerCommands = Array.from(commands.values())
        .filter((cmd) => cmd.config.role === 2 || cmd.config.role === 3)
        .map((cmd) => cmd.config.name)
        .sort((a, b) => a.localeCompare(b));

      let msg = "";
      msg += `❤️‍🔥𝗢𝘄𝗻𝗲𝗿 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀\n`;
      if (ownerCommands.length > 0) {
        ownerCommands.forEach((cmdName) => {
          msg += `\n💢- ${cmdName}`;
        });
      } else {
        msg += `\nNo owner commands available.`;
      }
      msg += `\n\n𝗧𝘆𝗽𝗲 ${prefix}help 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗻𝗮𝗺𝗲 𝘁𝗼 𝘃𝗶𝗲𝘄 𝘂𝘀𝗮𝗴𝗲`;
      await message.reply({ body: msg });

    // Otherwise, assume the argument is a command name and show its details.
    } else {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));

      if (!command) {
        await message.reply(`Command "${commandName}" not found.`);
      } else {
        const configCommand = command.config;
        const roleText = roleTextToString(configCommand.role);
        const author = configCommand.author || "Unknown";

        const longDescription = configCommand.longDescription
          ? configCommand.longDescription.en || "No description"
          : "No description";

        const guideBody = configCommand.guide?.en || "No guide available.";
        const usage = guideBody.replace(/{p}/g, prefix).replace(/{n}/g, configCommand.name);

        const response =
          `✪ 𝗡𝗮𝗺𝗲 : ${configCommand.name}${configCommand.aliases && configCommand.aliases.length > 0 ? ', ' + configCommand.aliases.join(", ") : ''}\n` +
          `✪ 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 : ${longDescription}\n` +
          `✪ 𝗥𝗼𝗹𝗲 : ${roleText}\n` +
          `✪ 𝗧𝗶𝗺𝗲 𝗽𝗲𝗿 𝘀𝗲𝗰𝗼𝗻𝗱 : ${configCommand.countDown || 1}s\n` +
          `✪ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 : ${configCommand.version || "1.0"}\n` +
         `✪ 𝗔𝘂𝘁𝗵𝗼𝗿 : ${author}\n`+
          `✪ 𝗨𝘀𝗮𝗴𝗲 : ${usage}`;
        await message.reply(response);
      }
    }
  },
};

function roleTextToString(roleValue) {
  switch (roleValue) {
    case 0:
      return "0 (All users)";
    case 1:
      return "1 (Group administrators)";
    case 2:
      return "2 (Admin bot)";
    case 3:
      return "3 (Admin bot additional)";
    default:
      return "Unknown role";
  }
}