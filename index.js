const fs = require("fs");
const login = require("fca-unofficial");

let replyData;
try {
    replyData = JSON.parse(fs.readFileSync('replies.json', 'utf8'));
} catch (error) {
    console.error("replies.json load error:", error);
    process.exit(1);
}

const keywords = replyData.keywords;
const badWords = replyData.badWords;

// Config
const PREFIX = ".";
const BOT_NAME = "Abal";
const cooldowns = {};

// Crash Protection
process.on('unhandledRejection', (error) => console.error("Unhandled Rejection:", error));
process.on('uncaughtException', (error) => console.error("Uncaught Exception:", error));

// Login with appstate
login({appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8'))}, (err, api) => {
    if(err) return console.error("Login Error! Appstate expire hoise ba 2FA on ase:", err);
    
    console.log(`${BOT_NAME} Bot Successfully Connected! Prefix: ${PREFIX}`);
    api.setOptions({listenEvents: true, selfListen: false});

    api.listenMqtt((err, event) => {
        if(err) return;

        if(event.type === "event") {
            const { logMessageType, logMessageData, threadID } = event;
            if(logMessageType === "log:subscribe") {
                const addedParticipants = logMessageData.addedParticipants;
                for (const participant of addedParticipants) {
                    api.sendMessage({
                        body: `Welcome ${participant.fullName}! ${BOT_NAME} er elakay swagotom. 🔥`,
                        mentions: [{ tag: participant.fullName, id: participant.userFbId }]
                    }, threadID);
                }
            } else if(logMessageType === "log:unsubscribe") {
                const id = logMessageData.leftParticipantFbId;
                api.getUserInfo(id, (err, ret) => {
                    if (err || !ret[id]) return;
                    api.sendMessage({
                        body: `Aha re! ${ret[id].name} group theke kete porse. RIP! 🕊️`,
                        mentions: [{ tag: ret[id].name, id: id }]
                    }, threadID);
                });
            }
        }

        if(event.type === "message") {
            if(!event.body) return;
            
            const msg = event.body.toLowerCase();
            const sender = event.senderID;
            const thread = event.threadID;

            if (cooldowns[sender] && Date.now() - cooldowns[sender] < 4000) return;

            if (msg.startsWith(PREFIX)) {
                const args = msg.slice(PREFIX.length).trim().split(/ +/g);
                const command = args.shift().toLowerCase();
                if(command === "abal" || command === "info") {
                    cooldowns[sender] = Date.now();
                    return api.sendMessage(`${BOT_NAME} bot online ase! Prefix hobe "${PREFIX}". E charao ami auto reply dei.`, thread, event.messageID);
                }
            }

            let isBadWord = false;
            for(const word of badWords) {
                if(msg.includes(word)) { isBadWord = true; break; }
            }

            if(isBadWord) {
                cooldowns[sender] = Date.now();
                return setTimeout(() => api.sendMessage({ body: "Gali dis na bhai, Abal bot er kache shob record thake! 🧼" }, thread, event.messageID), 1500);
            }

            for (const key in keywords) {
                if (msg.includes(key)) {
                    const replies = keywords[key];
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    cooldowns[sender] = Date.now();
                    return setTimeout(() => api.sendMessage({ body: randomReply }, thread, event.messageID), Math.floor(Math.random() * 2000) + 1000);
                }
            }
        }
    });
});
