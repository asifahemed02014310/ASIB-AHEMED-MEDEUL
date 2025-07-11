const { config } = global.GoatBot;
const { MongoClient } = require('mongodb');

// MongoDB connection setup
let db;
let adminCollection;

async function connectToDatabase() {
    if (!db) {
        const client = new MongoClient(config.uriMongodb);
        await client.connect();
        db = client.db();
        adminCollection = db.collection('admins');
    }
    return { db, adminCollection };
}

// Sync database with config array (call this on bot startup)
async function syncConfigWithDatabase() {
    try {
        const { adminCollection } = await connectToDatabase();
        const adminDoc = await adminCollection.findOne({ _id: 'adminBot' });
        
        if (adminDoc && adminDoc.admins) {
            // Update config.adminBot with database data
            config.adminBot = [...adminDoc.admins];
            console.log('✅ Admin data synced from database:', config.adminBot);
        }
    } catch (error) {
        console.error('❌ Failed to sync admin data from database:', error);
    }
}

// Initialize admin data in database and sync with config
async function initializeAdminData() {
    const { adminCollection } = await connectToDatabase();
    
    // Check if admin document exists
    const adminDoc = await adminCollection.findOne({ _id: 'adminBot' });
    
    if (!adminDoc) {
        // Create initial admin document with existing admins from config
        await adminCollection.insertOne({
            _id: 'adminBot',
            admins: config.adminBot || []
        });
    } else {
        // Sync database data with config on bot startup
        config.adminBot = adminDoc.admins || [];
    }
}

// Get admin list from database
async function getAdminList() {
    const { adminCollection } = await connectToDatabase();
    const adminDoc = await adminCollection.findOne({ _id: 'adminBot' });
    return adminDoc ? adminDoc.admins : [];
}

// Update admin list in database
async function updateAdminList(newAdminList) {
    const { adminCollection } = await connectToDatabase();
    await adminCollection.updateOne(
        { _id: 'adminBot' },
        { $set: { admins: newAdminList } },
        { upsert: true }
    );
}

// Add admin to database and sync with config
async function addAdminToDatabase(uid) {
    const { adminCollection } = await connectToDatabase();
    await adminCollection.updateOne(
        { _id: 'adminBot' },
        { $addToSet: { admins: uid } },
        { upsert: true }
    );
    
    // Sync with config array
    if (!config.adminBot.includes(uid)) {
        config.adminBot.push(uid);
    }
}

// Remove admin from database and sync with config
async function removeAdminFromDatabase(uid) {
    const { adminCollection } = await connectToDatabase();
    await adminCollection.updateOne(
        { _id: 'adminBot' },
        { $pull: { admins: uid } }
    );
    
    // Sync with config array
    const index = config.adminBot.indexOf(uid);
    if (index > -1) {
        config.adminBot.splice(index, 1);
    }
}

// Check if user is admin
async function isAdmin(uid) {
    const adminList = await getAdminList();
    return adminList.includes(uid);
}

module.exports = {
    config: {
        name: "adminadd",
        aliases: ["ad"],
        version: "1.3",
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
            noAdmins: "⚠️ | There are currently no users with admin role",
            databaseError: "❌ | Database error occurred. Please try again later."
        }
    },

    // This function runs when the bot starts up
    onLoad: async function() {
        try {
            await syncConfigWithDatabase();
        } catch (error) {
            console.error('❌ Failed to sync admin data on startup:', error);
        }
    },

    onStart: async function ({ message, args, usersData, event, getLang }) {
        try {
            // Initialize database connection and admin data
            await initializeAdminData();

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
                        uids = args.filter(arg => !isNaN(arg));
                    }

                    if (uids.length === 0) {
                        return message.reply(getLang("missingIdAdd"));
                    }

                    const newAdmins = [];
                    const alreadyAdmins = [];

                    for (const uid of uids) {
                        const isAlreadyAdmin = await isAdmin(uid);
                        if (isAlreadyAdmin) {
                            alreadyAdmins.push(uid);
                        } else {
                            newAdmins.push(uid);
                            await addAdminToDatabase(uid);
                        }
                    }

                    const newAdminNames = await Promise.all(newAdmins.map(uid => usersData.getName(uid)));
                    const alreadyAdminNames = await Promise.all(alreadyAdmins.map(uid => usersData.getName(uid)));

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
                        uids = args.filter(arg => !isNaN(arg));
                    }

                    if (uids.length === 0) {
                        return message.reply(getLang("missingIdRemove"));
                    }

                    const removedAdmins = [];
                    const notAdmins = [];

                    for (const uid of uids) {
                        const isCurrentlyAdmin = await isAdmin(uid);
                        if (isCurrentlyAdmin) {
                            removedAdmins.push(uid);
                            await removeAdminFromDatabase(uid);
                        } else {
                            notAdmins.push(uid);
                        }
                    }

                    const removedAdminNames = await Promise.all(removedAdmins.map(uid => usersData.getName(uid)));
                    const notAdminNames = await Promise.all(notAdmins.map(uid => usersData.getName(uid)));

                    return message.reply(
                        (removedAdmins.length > 0 ? 
                            getLang("removed", removedAdmins.length, removedAdminNames.map(name => `• ${name}`).join("\n")) : "") +
                        (notAdmins.length > 0 ? 
                            getLang("notAdmin", notAdmins.length, notAdminNames.map(name => `• ${name}`).join("\n")) : "")
                    );
                }
                
                case "list":
                case "-l": {
                    const adminList = await getAdminList();
                    
                    if (adminList.length === 0) {
                        return message.reply(getLang("noAdmins"));
                    }
                    
                    const adminNames = await Promise.all(adminList.map(async (uid) => {
                        const name = await usersData.getName(uid);
                        return `• ${name} (${uid})`;
                    }));
                    
                    return message.reply(getLang("adminList", adminList.length, adminNames.join("\n")));
                }

                default: {
                    return message.reply("⚠️ | Invalid command! Use 'add', 'remove', or 'list'.");
                }
            }
        } catch (error) {
            console.error("Admin management error:", error);
            return message.reply(getLang("databaseError"));
        }
    }
};
