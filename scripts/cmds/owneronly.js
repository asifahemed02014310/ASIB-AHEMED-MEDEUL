const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
  config: {
    name: "owneronly",
    aliases: ["owonly", "onlyo", "onlyowner"],
    version: "1.0",
    author: "Nur",
    countDown: 5,
    role: 3,
    description: {
      en: "turn on/off only owner can use bot"
    },
    category: "BOT MANAGEMENT",
    guide: {
      en: "   {pn} [on | off]: turn on/off the mode only owner can use bot"
    }
  },

  langs: {
    en: {  
      turnedOn: "Turned on the mode only owner can use bot",  
      turnedOff: "Turned off the mode only owner can use bot"
    }
  },

  onStart: function ({ args, message, getLang, event }) {
    if (!GoatBot.config.ownerBot.includes(event.senderID)) {
      return;
    }
    
    let value;

    if (args[0] == "on")  
      value = true;  
    else if (args[0] == "off")  
      value = false;  
    else  
      return message.SyntaxError();  

    if (!config.ownerOnly) {
      config.ownerOnly = {
        enable: false
      };
    }

    config.ownerOnly.enable = value;  
    message.reply(getLang(value ? "turnedOn" : "turnedOff"));  

    fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
  }
};