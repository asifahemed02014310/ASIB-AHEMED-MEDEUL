const DIG = require("discord-image-generation");
const fs = require("fs-extra");

module.exports = {
    config: {
        name: "kiss",
        aliases: ["kiss"],
        version: "1.1",
        author: "NIB",//updated by Nur
        countDown: 5,
        role: 2,
        shortDescription: "KISS",
        longDescription: "Create a kiss image with proper gender positioning (girl on left, boy on right)",
        category: "funny",
        guide: "{pn} @mention"
    },

    onStart: async function ({ api, message, event, args, usersData }) {
        const mention = Object.keys(event.mentions);
        if (mention.length == 0) return message.reply("Please mention someone");

        let firstUser, secondUser;
        
        const sender = event.senderID;
        const mentioned = mention[0];
        
        try {
            const senderData = await usersData.get(sender);
            const mentionedData = await usersData.get(mentioned);
            
            const senderGender = senderData.gender; 
            const mentionedGender = mentionedData.gender;
            

            if (senderGender === 1 && mentionedGender === 2) {
                firstUser = sender;
                secondUser = mentioned;
            } else if (senderGender === 2 && mentionedGender === 1) {
         
                firstUser = mentioned;
                secondUser = sender;
            } else {
                firstUser = sender;
                secondUser = mentioned;
            }
            

            if (mention.length > 1) {
                const secondMentioned = mention[1];
                const secondMentionedData = await usersData.get(secondMentioned);
                
                if (mentionedData.gender === 1 && secondMentionedData.gender === 2) {

                    firstUser = mentioned;
                    secondUser = secondMentioned;
                } else if (mentionedData.gender === 2 && secondMentionedData.gender === 1) {
                    firstUser = secondMentioned;
                    secondUser = mentioned;
                } else {

                    firstUser = mentioned;
                    secondUser = secondMentioned;
                }
            }
            
            const avatarURL1 = await usersData.getAvatarUrl(firstUser);
            const avatarURL2 = await usersData.getAvatarUrl(secondUser);
            const img = await new DIG.Kiss().getImage(avatarURL1, avatarURL2);
            const pathSave = `${__dirname}/tmp/${firstUser}_${secondUser}_kiss.png`;
            fs.writeFileSync(pathSave, Buffer.from(img));
            
            let content = "";
            if (mention.length === 1) {
                const senderName = senderData.name || "You";
                const mentionedName = mentionedData.name || "them";
                content = `${senderName} kissed ${mentionedName} 😘`;
            } else {
                const firstName = mentionedData.name || "Someone";
                const secondName = secondMentionedData.name || "someone else";
                content = `${firstName} kissed ${secondName} 😘`;
            }
          
            message.reply({
                body: content,
                attachment: fs.createReadStream(pathSave)
            }, () => fs.unlinkSync(pathSave));
            
        } catch (error) {
            console.error("Error in kiss command:", error);
            message.reply("An error occurred while creating the kiss image. Please try again later.");
        }
    }
};
