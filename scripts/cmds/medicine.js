const fs = require("fs");
const { parse } = require("csv-parse");
const Fuse = require("fuse.js");

let cachedMedicines = null;
let cachedFuse = null;

async function loadMedicines() {
    if (cachedMedicines) return cachedMedicines;

    cachedMedicines = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream("./med.csv")
            .pipe(parse({ columns: true, trim: true }))
            .on("data", (row) => cachedMedicines.push(row))
            .on("end", () => {
                cachedFuse = new Fuse(cachedMedicines, {
                    keys: ["Medicine Name", "Full name", "Generic Name", "Manufactur By", "Strength"],
                    threshold: 0.4
                });
                resolve(cachedMedicines);
            })
            .on("error", (err) => {
                console.error(err);
                reject(err);
            });
    });
}

module.exports = {
    config: {
        name: "osud",
        version: "3.1",
        author: "Seba AI",
        countDown: 2,
        role: 0,
        shortDescription: "ওষুধের ইনফো নিন",
        longDescription: "medicine/osud/info/mediba/med কমান্ডে ওষুধের নাম লিখলেই ফুল ইনফো পাবেন।",
        category: "health",
        guide: "উদাহরণ: osud Nervex অথবা Nervex:3"
    },

    onStart: async function ({ message }) {
        return message.reply("ওষুধের তথ্য পেতে osud/medicine/info/mediba/med লিখে নাম লিখুন।");
    },

    onChat: async function ({ message, event, threadsData }) {
        const input = event.body?.trim();
        if (!input) return;

        const cleanInput = input.replace(/[!?$\\/+_#]+/g, "").trim();
        if (!cleanInput) return;

        let threadData = await threadsData.get(event.threadID) || { activeCommand: null, fuse: null };
        const lowerInput = cleanInput.toLowerCase();
        const triggers = ["osud", "medicine", "info", "mediba", "med","ousud", "ওষুধ", ""];

        const parts = lowerInput.split(" ");
        const trigger = parts[0];
        const queryRest = parts.slice(1).join(" ").trim();
        const isTriggerCommand = triggers.includes(trigger);

        if (isTriggerCommand && queryRest.length > 0) {
            try {
                await loadMedicines();
                await threadsData.set(event.threadID, { activeCommand: "info", fuse: cachedFuse });

                const { medicineName, resultLimit } = extractQuery(queryRest);
                return await replyMedicineInfo(message, medicineName, resultLimit, cachedFuse);
            } catch (err) {
                return message.reply("CSV ফাইল পড়তে সমস্যা হয়েছে।");
            }
        }

        if (cleanInput.startsWith(".") && !cleanInput.startsWith(".info")) {
            await threadsData.set(event.threadID, { activeCommand: null, fuse: null });
            return;
        }

        if (isTriggerCommand && !queryRest.length) {
            await loadMedicines();
            await threadsData.set(event.threadID, { activeCommand: "info", fuse: cachedFuse });
            return message.reply("জি, এখন ওষুধের নাম লিখুন।");
        }

        if (threadData.activeCommand === "info" && threadData.fuse) {
            const { medicineName, resultLimit } = extractQuery(cleanInput);
            return await replyMedicineInfo(message, medicineName, resultLimit, threadData.fuse);
        }
    }
};

// Query parser
function extractQuery(text) {
    const match = text.match(/^(.+?):(\d+)$/);
    let medicineName = text;
    let resultLimit = 1;

    if (match) {
        medicineName = match[1].trim();
        resultLimit = parseInt(match[2]) || 1;
    }

    return { medicineName, resultLimit };
}

// Response builder
async function replyMedicineInfo(message, name, limit, fuse) {
    const results = fuse.search(name);
    const matched = results.map(r => r.item);

    if (matched.length === 0) {
        return message.reply(`No medicine found with the name "${name}".`);
    }

    const formatted = matched.slice(0, limit).map((item, index) => {
        return `➤ Medicine #${index + 1}
──────────────────────
• Name: ${item["Medicine Name"] || "N/A"}
• Full Name: ${item["Full name"] || "N/A"}
• Brand ID: ${item["Brand Id"] || "N/A"}
• Category: ${item["Category Name"] || "N/A"}
• Generic: ${item["Generic Name"] || "N/A"}
• Dosage Form: ${item["Dosage Form"] || "N/A"}
• Strength: ${item["Strength"] || "N/A"}
• Manufacturer: ${item["Manufactur By"] || "N/A"}

💊 Price Details:
  - Strip Price: ${item["Strip Price"] || "N/A"}৳
  - Per Piece: ${item["Per Piece"] || "N/A"}৳
  - Unit (Box/Pack): ${item["Unit"] || "N/A"}
──────────────────────`;
    }).join("\n\n");

    return message.reply(formatted);
}
