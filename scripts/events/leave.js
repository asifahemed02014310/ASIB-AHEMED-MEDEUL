const { getTime, drive } = global.utils;

module.exports = {
	config: {
		name: "leave",
		version: "1.5",
		author: "NTKhang",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			leaveType1: "tự rời",
			leaveType2: "bị kick",
			defaultLeaveMessage: "{userName} đã {type} khỏi nhóm"
		},
		en: {
			session1: "𝙈𝙤𝙧𝙣𝙞𝙣𝙜",
			session2: "𝙉𝙤𝙤𝙣",
			session3: "𝘼𝙛𝙩𝙚𝙧𝙣𝙤𝙤𝙣",
			session4: "𝙀𝙫𝙚𝙣𝙞𝙣𝙜",
			leaveType1: "𝗟𝗲𝗳𝘁 নিছে",
			leaveType2: "কে 𝗞𝗶𝗰𝗸 দিছে",
			defaultLeaveMessage: "সাধুবাদ {userName}🐸\nযা ভাগ শালা {userName} 😂\nগ্রুপে থাকার যোগ্যতা নাই দেখে {userName} {type} 🐸"
		}
	},

	onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
		if (event.logMessageType == "log:unsubscribe")
			return async function () {
				try {
					const { threadID } = event;
					const threadData = await threadsData.get(threadID);
					if (!threadData.settings.sendLeaveMessage)
						return;
					const { leftParticipantFbId } = event.logMessageData;
					if (leftParticipantFbId == api.getCurrentUserID())
						return;
					const hours = getTime("HH");

					const threadName = threadData.threadName || "Unknown Group";
					const userName = await usersData.getName(leftParticipantFbId);

					// {userName}   : name of the user who left the group
					// {type}       : type of the message (leave)
					// {boxName}    : name of the box
					// {threadName} : name of the box
					// {time}       : time
					// {session}    : session

					let { leaveMessage = getLang("defaultLeaveMessage") } = threadData.data || {};
					const form = {
						mentions: leaveMessage.match(/\{userNameTag\}/g) ? [{
							tag: userName,
							id: leftParticipantFbId
						}] : null
					};

					leaveMessage = leaveMessage
						.replace(/\{userName\}|\{userNameTag\}/g, userName)
						.replace(/\{type\}/g, leftParticipantFbId == event.author ? getLang("leaveType1") : getLang("leaveType2"))
						.replace(/\{threadName\}|\{boxName\}/g, threadName)
						.replace(/\{time\}/g, hours)
						.replace(/\{session\}/g, hours <= 10 ?
							getLang("session1") :
							hours <= 12 ?
								getLang("session2") :
								hours <= 18 ?
									getLang("session3") :
									getLang("session4")
						);

					form.body = leaveMessage;

					if (leaveMessage.includes("{userNameTag}")) {
						form.mentions = [{
							id: leftParticipantFbId,
							tag: userName
						}];
					}

					if (threadData.data && threadData.data.leaveAttachment && Array.isArray(threadData.data.leaveAttachment)) {
						const files = threadData.data.leaveAttachment;
						try {
							const attachments = files.reduce((acc, file) => {
								if (file) {
									acc.push(drive.getFile(file, "stream"));
								}
								return acc;
							}, []);
							
							const results = await Promise.allSettled(attachments);
							form.attachment = results
								.filter(({ status }) => status == "fulfilled")
								.map(({ value }) => value);
						} catch (attachmentError) {
							console.error("Error loading leave attachments:", attachmentError);
							// Continue sending the message without attachments
						}
					}
					
					await message.send(form);
				} catch (error) {
					console.error("Error in leave event:", error);
				}
			};
	}
};