var SERVER = {};
SERVER.emoteData = {};
SERVER.emoteMap = {};

var io = require('socket.io').listen(5432);
// Configure
io.enable('browser client minification');  // send minified client
//io.enable('browser client etag');        // apply etag caching logic based on SERVER.VERSION number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging
io.set('transports', [                     // enable all transports (optional if you want flashsocket)
    'websocket'
//  , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
]);
var http = require('http');
var et = require('elementtree');
var fs = require('fs');
var util = require('util');
var crypto = require('crypto');
var url = require('url');

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    try {
        eval(chunk);
    } catch (e) {
        console.error(e);
    }
});

function mergeObjects(one, two) {
    var result = {};
    for (var item in one) {
        result[item] = one[item];
    }
    for (var item in two) {
        result[item] = two[item];
    }
    return result;
}

function refreshEmoteData() {
    var options = {};
    http.get(options,function (res) {
        res.setEncoding('uft8');
        res.on('data', function (chunk) {
            recievedBody += chunk;
        });
        res.on('end', function () {
            try {
                eval(recievedBody);
                var max = berryEmotes.length;
                for (var i = 0; i < max; ++i) {
                    var berryemote = berryEmotes[i];
                    if (!berryemote.names[0] in SERVER.emoteData) {
                        SERVER.emoteData[berryemote.names[0]] = {};
                    }
                    SERVER.emoteMap[berryemote.names[0]] = i;
                }
            } catch (e) {
                console.log("error loading data: " + e);
            }
        });
    }).on('error', function (e) {
              console.log('Error loading data: ' + e);
          });
}
function saveData() {
    console.log(SERVER.emoteData);
}

function init() {
    refreshEmoteData();
    setTimeout(saveData, 60000);
}
init();
io.sockets.on('connection', function (socket) {
    socket.on('getEmote', function (data) {
        var emote = berryEmote[SERVER.emoteMap[data.name]];
        if (!emote) {
            console.log("Couldn't get emote by name.");
            return;
        }
        var tags = SERVER.emoteData[data.name];
        var emoteData = mergeObjects(tags, emote);
        socket.emit('getEmote', emoteData);
    });

    socket.on('setTags', function (data) {
        SERVER.emoteData[data.name].tags = data.tags;
    });
});