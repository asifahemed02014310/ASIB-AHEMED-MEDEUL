const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
    config: {
        name: "adminadd",
        aliases: ["ad"],
        version: "1.4",
        author: "Nur",
        countDown: 5,
        role: 2,
        category: "𝗕𝗢𝗧 𝗠𝗔𝗡𝗔𝗚𝗘𝗠𝗘𝗡𝗧",
        guide: {
            en: "   {pn} [add | -a] <uid | @tag>: Add admin role for a user\n" +
                "   {pn} [remove | -r] <uid | @tag>: Remove admin role from a user\n" +
                "   {pn} [add | -a] (reply): Add admin role for the user you replied to\n" +
                "   {pn} [list | -l]: List all users with admin role"
        }
    },

    langs: {
        en: {
            added: "✅ | Added admin role for %1 users:\n%2",
            alreadyAdmin: "\n⚠️ | %1 users already have admin role:\n%2",
            missingIdAdd: "⚠️ | Please provide an ID, tag a user, or reply to a message to add admin role",
            removed: "✅ | Removed admin role from %1 users:\n%2",
            notAdmin: "⚠️ | %1 users do not have admin role:\n%2",
            missingIdRemove: "⚠️ | Please provide an ID, tag a user, or reply to a message to remove admin role",
            adminList: "📋 | Admin List (%1 users):\n%2",
            noAdmins: "⚠️ | There are currently no users with admin role"
        }
    },

    onStart: async function ({ message, args, usersData, event, getLang }) {
        switch (args[0]) {
            case "add":
            case "-a": {
                let uids = [];

                // Check for mentioned users, replied message, or direct IDs
                if (Object.keys(event.mentions).length > 0) {
                    uids = Object.keys(event.mentions);
                } else if (event.messageReply) {
                    uids.push(event.messageReply.senderID);
                } else {
                    uids = args.slice(1).filter(arg => !isNaN(arg));
                }

                if (uids.length === 0) {
                    return message.reply(getLang("missingIdAdd"));
                }

                const newAdmins = [];
                const alreadyAdmins = [];

                for (const uid of uids) {
                    try {
                        // Check if user exists in database, if not create them
                        let userData = await usersData.get(uid);
                        if (!userData) {
                            await usersData.create(uid);
                            userData = await usersData.get(uid);
                        }

                        // Check if already admin
                        const isCurrentlyAdmin = (userData.data && userData.data.isAdmin) || config.adminBot.includes(uid);
                        
                        if (isCurrentlyAdmin) {
                            alreadyAdmins.push(uid);
                        } else {
                            newAdmins.push(uid);
                        }
                    } catch (error) {
                        console.error(`Error checking user ${uid}:`, error);
                    }
                }

                // Update database and config for new admins
                for (const uid of newAdmins) {
                    try {
                        // Update database
                        await usersData.set(uid, {
                            isAdmin: true
                        }, "data");

                        // Update config file for immediate effect and persistence
                        if (!config.adminBot.includes(uid)) {
                            config.adminBot.push(uid);
                        }
                    } catch (error) {
                        console.error(`Error adding admin ${uid}:`, error);
                    }
                }

                // Save config changes
                if (newAdmins.length > 0) {
                    try {
                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                    } catch (error) {
                        console.error("Error saving config:", error);
                    }
                }

                const newAdminNames = await Promise.all(newAdmins.map(async uid => {
                    try {
                        return await usersData.getName(uid);
                    } catch {
                        return uid;
                    }
                }));
                
                const alreadyAdminNames = await Promise.all(alreadyAdmins.map(async uid => {
                    try {
                        return await usersData.getName(uid);
                    } catch {
                        return uid;
                    }
                }));

                return message.reply(
                    (newAdmins.length > 0 ? 
                        getLang("added", newAdmins.length, newAdminNames.map(name => `• ${name}`).join("\n")) : "") +
                    (alreadyAdmins.length > 0 ? 
                        getLang("alreadyAdmin", alreadyAdmins.length, alreadyAdminNames.map(name => `• ${name}`).join("\n")) : "")
                );
            }

            case "remove":
            case "-r": {
                let uids = [];

                // Check for mentioned users, replied message, or direct IDs
                if (Object.keys(event.mentions).length > 0) {
                    uids = Object.keys(event.mentions);
                } else if (event.messageReply) {
                    uids.push(event.messageReply.senderID);
                } else {
                    uids = args.slice(1).filter(arg => !isNaN(arg));
                }

                if (uids.length === 0) {
                    return message.reply(getLang("missingIdRemove"));
                }

                const removedAdmins = [];
                const notAdmins = [];

                for (const uid of uids) {
                    try {
                        const userData = await usersData.get(uid);
                        const isCurrentlyAdmin = (userData && userData.data && userData.data.isAdmin) || config.adminBot.includes(uid);
                        
                        if (isCurrentlyAdmin) {
                            removedAdmins.push(uid);
                        } else {
                            notAdmins.push(uid);
                        }
                    } catch (error) {
                        console.error(`Error checking user ${uid}:`, error);
                        notAdmins.push(uid);
                    }
                }

                // Update database and config for removed admins
                for (const uid of removedAdmins) {
                    try {
                        // Update database
                        await usersData.set(uid, {
                            isAdmin: false
                        }, "data");

                        // Update config file
                        const index = config.adminBot.indexOf(uid);
                        if (index > -1) {
                            config.adminBot.splice(index, 1);
                        }
                    } catch (error) {
                        console.error(`Error removing admin ${uid}:`, error);
                    }
                }

                // Save config changes
                if (removedAdmins.length > 0) {
                    try {
                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                    } catch (error) {
                        console.error("Error saving config:", error);
                    }
                }

                const removedAdminNames = await Promise.all(removedAdmins.map(async uid => {
                    try {
                        return await usersData.getName(uid);
                    } catch {
                        return uid;
                    }
                }));
                
                const notAdminNames = await Promise.all(notAdmins.map(async uid => {
                    try {
                        return await usersData.getName(uid);
                    } catch {
                        return uid;
                    }
                }));

                return message.reply(
                    (removedAdmins.length > 0 ? 
                        getLang("removed", removedAdmins.length, removedAdminNames.map(name => `• ${name}`).join("\n")) : "") +
                    (notAdmins.length > 0 ? 
                        getLang("notAdmin", notAdmins.length, notAdminNames.map(name => `• ${name}`).join("\n")) : "")
                );
            }
            
            case "list":
            case "-l": {
                try {
                    // Get all users with admin role from database
                    const allUsers = await usersData.getAll();
                    const adminUsers = [];
                    
                    for (const [uid, userData] of allUsers) {
                        if (userData.data && userData.data.isAdmin) {
                            adminUsers.push(uid);
                        }
                    }
                    
                    // Also include config admins and merge them
                    const configAdmins = config.adminBot || [];
                    const allAdmins = [...new Set([...adminUsers, ...configAdmins])]; // Remove duplicates
                    
                    if (allAdmins.length === 0) {
                        return message.reply(getLang("noAdmins"));
                    }
                    
                    const adminNames = await Promise.all(allAdmins.map(async (uid) => {
                        try {
                            const name = await usersData.getName(uid);
                            return `• ${name} (${uid})`;
                        } catch {
                            return `• ${uid}`;
                        }
                    }));
                    
                    return message.reply(getLang("adminList", allAdmins.length, adminNames.join("\n")));
                } catch (error) {
                    console.error("Error listing admins:", error);
                    return message.reply("❌ | Error occurred while fetching admin list.");
                }
            }

            default: {
                return message.reply("⚠️ | Invalid command! Use 'add', 'remove', or 'list'.");
            }
        }
    }
}
