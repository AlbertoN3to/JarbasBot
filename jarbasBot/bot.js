const Discord = require("discord.js");
const auth = require("./auth.json");
const logger = require("winston");
const speech = require("node-witai-speech");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

let contentType = "audio/wav";
let receiverUniv;
let currentMessageChannel;

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
  colorize: true
});

logger.level = 'debug';

let bot = new Discord.Client();

bot.login(auth.token);

bot.on('ready', (evt) => {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', (message) => {
  if (message.toString().substring(0, 1) == '$') {
    let args = message.toString().substring(1).split("$");
    let voiceChannelId = message.member.voiceChannelID;
    switch (args[0]) {
      case "jarbas":
        if (voiceChannelId) {
          message.reply("Presente, mestre!")
          currentMessageChannel = message.channel;
          message.member.voiceChannel.join().then((connection) => {
            let receiver = connection.createReceiver();
            receiverUniv = receiver;
            connection.playFile('./1-hour-of-silence.mp3');
          }).catch((err) => {
            logger.error(err);
          });
        } else {
          message.reply("Mestre,por obséquio, o senhor poderia entrar em um canal de voz?")
        }
        break;
      case 'aposentos':
        message.reply("Certo,irei para meus aposentos mestre!");
        message.member.voiceChannel.leave();

        break;
    }
  }
});
let outputPath;

bot.on("guildMemberSpeaking", (member, speaking) => {
  if (receiverUniv && speaking) {
    console.log("RECORDING");
    try {
      outputPath = path.join("./records", `${member.id}-${Date.now()}.wav`);
      let stream = fs.createWriteStream(outputPath);
      ffmpeg(receiverUniv.createPCMStream(member))
        .inputFormat('s32le')
        .audioFrequency(48000)
        .audioChannels(2)
        .format('wav')
        .on('error', (err) => { console.log(err) })
        .writeToStream(stream, { end: false });
    } catch (error) {
      console.log(error);
    }
  } else if (receiverUniv && !speaking && member.voiceChannel) {
    if (outputPath !== null) {
      if (fs.statSync(outputPath).size < 400000) {
        let stream = fs.createReadStream(outputPath);
        new Promise((resolve, reject) => {
          speech.extractSpeechIntent(auth.witToken, stream, contentType, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
        }).then((data) => {
          console.log('o mlk falou:', data._text);
          if (data._text === "jarbas") {
            console.log("HHIHIHIHIHIIHIHIIHIHHI");
            currentMessageChannel.send("Qual seu desejo senhor?", { tts: true });
          } else {
            console.log("DEU MERDAAAAAAAA HIHIH");
          }
          fs.unlink(outputPath, (error) => {
            if (error) { console.log(error); }
          });
          outputPath = null;
        }).catch((error) => {
          console.log(error);
          fs.unlink(outputPath, (error) => {
            if (error) { console.log(error); }
          });
          outputPath = null;
        });
      } else {
        fs.unlink(outputPath, (error) => {
          if (error) { console.log(error); }
        });
        outputPath = null;
      }
    }
  }
});
