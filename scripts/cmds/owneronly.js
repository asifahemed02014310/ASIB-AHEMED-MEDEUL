const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
  config: {
    name: "owneronly",
    aliases: ["owonly", "onlyow", "onlyowner"],
    version: "1.0",
    author: "Nur",
    countDown: 5,
    role: 2,
    description: {
      en: "turn on/off only owner can use bot"
    },
    category: "BOT MANAGEMENT",
    guide: {
      en: "   {pn} [on | off]: turn on/off the mode only owner can use bot"  
          + "\n   {pn} noti [on | off]: turn on/off the notification when user is not owner use bot"  
    }
  },

  langs: {
    en: {  
      turnedOn: "Turned on the mode only owner can use bot",  
      turnedOff: "Turned off the mode only owner can use bot",  
      turnedOnNoti: "Turned on the notification when user is not owner use bot",  
      turnedOffNoti: "Turned off the notification when user is not owner use bot"  
    }
  },

  onStart: function ({ args, message, getLang, event }) {
    // Since this is the owner-only command itself, we allow it to be accessed only by owners
    // regardless of the current setting
    if (!GoatBot.config.ownerBot.includes(event.senderID)) {
      // Silent ignore for non-owners
      return;
    }
    
    let isSetNoti = false;
    let value;
    let indexGetVal = 0;

    if (args[0] == "noti") {  
      isSetNoti = true;  
      indexGetVal = 1;  
    }  

    if (args[indexGetVal] == "on")  
      value = true;  
    else if (args[indexGetVal] == "off")  
      value = false;  
    else  
      return message.SyntaxError();  

    if (isSetNoti) {  
      config.hideNotiMessage.ownerOnly = !value;  
      message.reply(getLang(value ? "turnedOnNoti" : "turnedOffNoti"));  
    }  
    else {  
      config.ownerOnly.enable = value;  
      message.reply(getLang(value ? "turnedOn" : "turnedOff"));  
    }  

    fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
  }
};
