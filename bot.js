const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
const Twitter = require('twitter');
const download = require('image-downloader');
const schedule = require('node-schedule');
const path = require('path');

let clients = [];
let my_id, token, prefix;

fs.readFile('settings.json', (err, content) => {
    if (err) return timeLog('Error loading settings:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    var settings = JSON.parse(content);
    my_id = settings.my_id;
    token = settings.token;
    prefix = settings.prefix;
    clients_unformat = settings.clients;
    for (var i = 0; i < clients_unformat.length; i++) {
        clients.push(new Client(clients_unformat[i].name, clients_unformat[i].channel_id, clients_unformat[i].success_text, clients_unformat[i].twit_call, clients_unformat[i].config));
    }
    client.login(token);
});

client.on('ready', () => {
    timeLog(`Logged in as ${client.user.tag}!`);
});

client.on('error', console.error);

client.on('message', msg => {
    if (msg.author.bot && !msg.attachments) {
        return;
    }
    let found = false;
    let client_index;
    for (var i = 0; i < clients.length; i++) {
        for (var j = 0; j < clients[i].channel_id.length; j++) {
            if (msg.channel.id == clients[i].channel_id[j]){
                found = true;
                client_index = i;
            } 
        }
    }
    if (!found) return;
    var attachments = msg.attachments.array();
    for (var i = 0; i < attachments.length; i++) {
        let attach = attachments[i];
        var url = attach.url;
        var options = {
            url: url,
            dest: path.join(__dirname, 'temp'),
            // headers: {
            //     'Authorization': 'Bearer ' + token
            // },
        };
        download.image(options).then(({ filename, image }) => {
            clients[client_index].T.post('media/upload', { media: image }, function (error, media, response) {
                if (error) console.log(error);
                var status = {
                    status: clients[client_index].success_text + msg.author.username + '! ' + clients[client_index].twit_call,
                    media_ids: media.media_id_string // Pass the media id string
                }
                clients[client_index].T.post('statuses/update', status, function (error, tweet, response) {
                    if (!error) {
                        console.log("Successfully posted a success!");
                    } else {
                        console.log("ERROR: SOMETHING WENT WRONG IN POSTING: " + error);
                    }
                });
            });
        })
            .catch((err) => {
                console.error(err);
            });
    }
});

function timeLog(message) {
    console.log(new Date() + '] ' + message);
}

function deleteFiles(d) {
    let directory = path.join(__dirname, d);
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
}

var j = schedule.scheduleJob('18 14 * * *', function () {
    deleteFiles('temp');
});

class Client {
    constructor(name, channel_id, success_text, twit_call, config) {
        this.name = name;
        this.token = token;
        this.channel_id = channel_id;
        this.success_text = success_text;
        this.twit_call = twit_call;
        this.config = config;
        this.T = new Twitter(config);
    }
}