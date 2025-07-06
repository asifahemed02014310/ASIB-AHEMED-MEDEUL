module.exports = {
	config: {
		name: "murgi",
		version: "1.0",
		author: "Hamim",
		countDown: 2,
		role: 1,
		description: {

			en: "Kick and re-add member from chat box"
		},
		category: "group",
		guide: {

			en: "   {pn} @tags/reply: kick and re-add tagged members\n   {pn} on [time] @tags/reply: kick and re-add, repeat every [time] minutes\n   {pn} off: turn off auto mode"
		}
	},

	langs: {
		en: {
			needAdmin: "Please add the bot as admin",
			protectedUser: "uira ja mangerpola 😾",
			autoModeOn: "Auto mode enabled, repeating every %1 minutes",
			autoModeOff: "Auto mode disabled",
			invalidTime: "Invalid time, please enter minutes in numbers",
			userProcessed: "Processed %1",
			noTarget: "Please reply or mention someone",
			processing: "Processing..."
		}
	},

	onLoad: async function({ threadsData, api }) {

		if (!global.murgiIntervals) {
			global.murgiIntervals = {};
		}
		
		console.log("Murgi command loaded, intervals storage initialized");
	},

	onStart: async function ({ message, event, args, threadsData, api, getLang, usersData }) {
		const adminIDs = await threadsData.get(event.threadID, "adminIDs");
		if (!adminIDs.includes(api.getCurrentUserID()))
			return message.reply(getLang("needAdmin"));
		

		const { config } = global.GoatBot;
		const protectedUIDs = config.ownerBot || [];
		

		if (!global.murgiIntervals) {
			global.murgiIntervals = {};
		}
		
		const threadID = event.threadID;
		

		if (args[0] === "off") {
			if (global.murgiIntervals[threadID]) {
				clearInterval(global.murgiIntervals[threadID]);
				delete global.murgiIntervals[threadID];
				console.log(`Cleared murgi interval for thread ${threadID}`);
			}
			await threadsData.set(threadID, { enabled: false }, "murgiAutoMode");
			return message.reply(getLang("autoModeOff"));
		}
		
		async function kickAndReAdd(uid, userName) {

			if (protectedUIDs.includes(uid)) {
				message.reply(getLang("protectedUser"));
				return "PROTECTED";
			}
			
			try {
				const threadInfo = await api.getThreadInfo(threadID);
				const userIndex = threadInfo.participantIDs.indexOf(uid);
				
				if (userIndex === -1) {
					console.log(`User ${uid} is not in the group`);
					return "NOT_IN_GROUP";
				}
				

				await api.removeUserFromGroup(uid, threadID);
				console.log(`Kicked user ${uid} (${userName})`);
				

				await new Promise(resolve => setTimeout(resolve, 2000));
				

				const addUser = await api.addUserToGroup(uid, threadID);
              if (addUser) {
            	console.log(`Successfully re-added user ${uid} (${userName})`);
                	return "SUCCESS";
               } else {
               	message.reply(`❌ Failed to re-add ${userName}`);
               	console.log(`Failed to re-add user ${uid} (${userName})`);
                	return "FAILED_TO_ADD";
             }
			}
			catch (e) {
				console.error("Error in kickAndReAdd:", e);
				return "ERROR";
			}
		}
		

		let targetUIDs = [];
		let targetNames = [];
		

		if (args[0] === "on") {
			const time = parseInt(args[1]);
			if (isNaN(time) || time <= 0) {
				return message.reply(getLang("invalidTime"));
			}
			

			if (event.messageReply) {
				const replyUID = event.messageReply.senderID;
				let userName;
				try {
					userName = (await usersData.get(replyUID, "name")) || replyUID;
				} catch (e) {
					userName = replyUID;
				}
				targetUIDs = [replyUID];
				targetNames = [userName];
				console.log(`Murgi on command with reply - Target: ${userName} (${replyUID})`);
			} else if (Object.keys(event.mentions).length > 0) {
				const uids = Object.keys(event.mentions);
				for (const uid of uids) {
					const userName = event.mentions[uid] || uid;
					targetUIDs.push(uid);
					targetNames.push(userName);
				}
				console.log(`Murgi on command with mentions - Targets: ${targetNames.join(", ")}`);
			} else {
				return message.reply(getLang("noTarget"));
			}
			
			message.reply(getLang("processing"));
			
			for (let i = 0; i < targetUIDs.length; i++) {
				const uid = targetUIDs[i];
				const userName = targetNames[i];
				
				const result = await kickAndReAdd(uid, userName);
				if (result === "PROTECTED") {
					continue;
				}
				if (result === "ERROR") {
					return message.reply(getLang("needAdmin"));
				}
				
				if (i < targetUIDs.length - 1) {
					await new Promise(resolve => setTimeout(resolve, 3000));
				}
			}
			
			if (global.murgiIntervals[threadID]) {
				clearInterval(global.murgiIntervals[threadID]);
				delete global.murgiIntervals[threadID];
			}
			
			const intervalTime = time * 60 * 1000;
			console.log(`Setting up murgi auto mode for thread ${threadID} every ${time} minutes`);
			
			global.murgiIntervals[threadID] = setInterval(async () => {
				console.log(`Auto murgi triggered for thread ${threadID}`);
				
				for (let i = 0; i < targetUIDs.length; i++) {
					const uid = targetUIDs[i];
					const userName = targetNames[i];
					
					if (!protectedUIDs.includes(uid)) {
						console.log(`Auto processing user: ${userName} (${uid})`);
						await kickAndReAdd(uid, userName);
						
						if (i < targetUIDs.length - 1) {
							await new Promise(resolve => setTimeout(resolve, 3000));
						}
					}
				}
			}, intervalTime);

			await threadsData.set(threadID, {
				enabled: true,
				time: time,
				targetUsers: targetUIDs.map((uid, index) => ({
					uid: uid,
					name: targetNames[index]
				}))
			}, "murgiAutoMode");
			
			return message.reply(getLang("autoModeOn", time));
		}
		

		if (event.messageReply) {
			const replyUID = event.messageReply.senderID;
			let userName;
			try {
				userName = (await usersData.get(replyUID, "name")) || replyUID;
			} catch (e) {
				userName = replyUID;
			}
			
			console.log(`Regular murgi command with reply - Target: ${userName} (${replyUID})`);
			
			const result = await kickAndReAdd(replyUID, userName);
			if (result === "PROTECTED" || result === "ERROR") {
				if (result === "ERROR") {
					return message.reply(getLang("needAdmin"));
				}
				return;
			}
		} else if (Object.keys(event.mentions).length > 0) {
			const uids = Object.keys(event.mentions);
			
			console.log(`Regular murgi command with mentions - Targets: ${uids.length} users`);
			
			for (let i = 0; i < uids.length; i++) {
				const uid = uids[i];
				const userName = event.mentions[uid] || uid;
				
				const result = await kickAndReAdd(uid, userName);
				if (result === "PROTECTED") {
					continue;
				}
				if (result === "ERROR") {
					return message.reply(getLang("needAdmin"));
				}
				
				if (i < uids.length - 1) {
					await new Promise(resolve => setTimeout(resolve, 3000));
				}
			}
		} else {
			return message.reply(getLang("noTarget"));
		}
	}
};
