var berryEmotesEnabled = localStorage.getItem('berryEmotesEnabled') !== "false";
var showNsfwEmotes = localStorage.getItem('showNsfwEmotes') !== "false";
var maxEmoteHeight = +localStorage.getItem('maxEmoteHeight') || 200;
var berryEmotesDebug = localStorage.getItem('berryEmotesDebug') !== "false";
var apngSupported = localStorage.getItem('apngSupported');
// Leaving as none so we can test for it later on.
if (apngSupported === "false") apngSupported = false;
var berryEmoteMap = {};
var emoteRegex = /\[\]\(\/([\w:!#\/]+)[-\w]*\)/g;

function applyEmotesToStr(chatMessage) {
    var match;
    while (match = emoteRegex.exec(chatMessage)) {
        var emote = berryEmoteMap[match[1]];
        if (emote) {
            emote = berryEmotes[emote];
            if (showNsfwEmotes === false && emote.nsfw) continue;
            var emote_code = getEmoteHtml(emote);
            if (berryEmotesDebug) console.log('Emote code: ' + emote_code);
            var replace_regex = new RegExp(['\\[\\]\\(\\/(', match[1] , ')[-\\w]*\\)'].join(''), 'g');
            chatMessage = chatMessage.replace(replace_regex, emote_code);
        }
    }
    return chatMessage;
}

function getEmoteHtml(emote) {
    var position_string = (emote['background-position'] || ['0px', '0px']).join(' ');
    emote['position_string'] = position_string;
    var emoteCode;
    if (apngSupported || !emote.apng) {
        emoteCode =
            ['<span class="berryemote',
                emote.height > maxEmoteHeight ? ' resize' : '',
                '" ',
                'style="',
                'background-image: url(', emote['background-image'], '); ',
                'height:', emote.height, 'px; ',
                'width:', emote.width, 'px; ',
                'background-position:', position_string, '; ',
                'display:inline-block;',
                '" title="', emote.names, ' from ', emote.sr, '"></span>'
            ].join('');
    }
    else {
        emoteCode =
            ['<span class="berryemote canvasapng ',
                emote.height > maxEmoteHeight ? ' resize' : '',
                '" ',
                'height:', emote.height, 'px; ',
                'width:', emote.width, 'px; ',
                'display:inline-block;',
                '" title="', emote.names, ' from ', emote.sr, '" ',
                'apng_url="', emote['apng_url'] , '"></span>'
            ].join('');
    }
    return emoteCode;
}


function postEmoteEffects(message) {
    if (!apngSupported) {
        var emotes_to_animate = message.find('.canvasapng');
        $.each(emotes_to_animate, function (i, emote) {
            var $emote = $(emote);
            APNG.createAPNGCanvas($emote.attr('apng_url'), function (canvas) {
                $emote.append(canvas);
            });
        });
    }

    var emotesToResize = message.find('.resize');
    $.each(emotesToResize, function (i, emote) {
        var $emote = $(emote);
        var scale = maxEmoteHeight / $emote.height();
        var innerWrap = $emote.wrap('<div class="emote-wrapper"><div class="emote-wrapper"></div></div>').parent();
        var outerWrap = innerWrap.parent();
        outerWrap.css('height', $emote.height() * scale);
        outerWrap.css('width', $emote.width() * scale);
        outerWrap.css('display', 'inline-block');
        outerWrap.css('position', 'relative');
        innerWrap.css('transform', ['scale(', scale, ', ', scale, ')'].join(''));
        innerWrap.css('transform-origin', 'left top');
        innerWrap.css('position', 'absolute');
        innerWrap.css('top', '0');
        innerWrap.css('left', '0');
    });
}

function applyEmotesToChat(chatMessage) {
    if (berryEmotesEnabled && chatMessage.match(emoteRegex)) {
        chatMessage = applyEmotesToStr(chatMessage);
        chatMessage = $('<span></span>').append(chatMessage);
        postEmoteEffects(chatMessage);
        return chatMessage;
    }
    else {
        chatMessage = $('<span></span>').html(chatMessage);
    }
    var re = new RegExp("^>");
    if (chatMessage.text().match(re)) chatMessage.addClass("green");
    return chatMessage;
}

function monkeyPatchChat() {
    formatChatMsg = function (msg) {
        var regexp = new RegExp("(http[s]{0,1}://[^ ]*)", 'ig');
        msg = msg.replace(regexp, '<a href="$&" target="_blank">$&</a>');
        msg = applyEmotesToChat(msg);
        var h = $('<span/>').html(msg);
        var re = new RegExp("^>");
        if (h.text().match(re)) h.addClass("green");
        return h;
    };
}

function monkeyPatchPoll() {
    var oldPoll = newPoll;
    newPoll = function (data) {
        oldPoll(data);
        var poll = $('.poll.active');
        var options = poll.find('div.label');
        $.each(options, function (i, option) {
            var $option = $(option);
            if (berryEmotesDebug) console.log(option);
            var t = $option.text().replace(">", "&gt;").replace("<", "&lt;");
            t = applyEmotesToStr(t);
            $option.html(t);
            postEmoteEffects($option);
        });
    }
}

function buildEmoteMap() {
    var max = berryEmotes.length;
    for (var i = 0; i < max; ++i) {
        var berryemote = berryEmotes[i];
        for (var j = 0; j < berryemote.names.length; ++j) {
            if (!berryEmoteMap[berryemote.names[j]]) {
                berryEmoteMap[berryemote.names[j]] = i;
            }
        }
    }
}

function injectSettingsButton() {
    whenExists('#chatControls', function () {
        if (berryEmotesDebug) console.log('Injecting settings button.');
        var settingsMenu = $('<div/>').addClass('settings').appendTo($('#chatControls')).text("Emotes");
        settingsMenu.css('margin-right', '2px');
        settingsMenu.css('background', 'url(http://backstage.berrytube.tv/marminator/bp.png) no-repeat scroll left center transparent');
        settingsMenu.click(function () {
            showBerrymoteConfig();
        });
        if (berryEmotesDebug) console.log('Settings button injected: ', settingsMenu);
    });
}

function waitToStart() {
    if (typeof berryEmotes === "undefined" && typeof berryemotes != "undefined") berryEmotes = berryemotes;
    if (typeof formatChatMsg === "undefined" || typeof berryEmotes === "undefined" ||
        typeof apngSupported === "undefined" ||
        (apngSupported ? false : typeof APNG === "undefined")) {
        setTimeout(waitToStart, 100);
        if (berryEmotesDebug) console.log('waiting ');
    }
    else {
        if (berryEmotesDebug) console.log('starting');
        buildEmoteMap();
        monkeyPatchChat();
        monkeyPatchPoll();
        injectSettingsButton();
    }
}

function showBerrymoteConfig() {
    var row;
    var settWin = $("body").dialogWindow({
        title: "BerryEmote Settings",
        uid: "berryEmoteSettings",
        center: true
    });

    var configOps = $('<fieldset/>').appendTo(settWin);
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("Display Emotes: ").appendTo(row);
    var displayEmotes = $('<input/>').attr('type', 'checkbox').appendTo(row);
    if (berryEmotesEnabled) displayEmotes.attr('checked', 'checked');
    displayEmotes.change(function () {
        var enabled = $(this).is(":checked");
        berryEmotesEnabled = enabled;
        localStorage.setItem('berryEmotesEnabled', enabled);
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("NSFW Emotes: ").appendTo(row);
    var nsfwEmotes = $('<input/>').attr('type', 'checkbox').appendTo(row);
    if (showNsfwEmotes) nsfwEmotes.attr('checked', 'checked');
    nsfwEmotes.change(function () {
        var enabled = $(this).is(":checked");
        showNsfwEmotes = enabled;
        localStorage.setItem('showNsfwEmotes', enabled);
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("Max Height: ").appendTo(row);
    var maxHeight = $('<input/>').attr('type', 'text').val(maxEmoteHeight).addClass("small").appendTo(row);
    maxHeight.css('text-align', 'center');
    maxHeight.css('width', '30px');
    maxHeight.keyup(function () {
        maxEmoteHeight = maxHeight.val();
        localStorage.setItem('maxEmoteHeight', maxHeight.val());
    });
    $('<span/>').text("pixels.").appendTo(row);
//----------------------------------------

    settWin.window.center();
}

if (apngSupported === null) {
    (function () {
        "use strict";
        var apngTest = new Image(),
            ctx = document.createElement("canvas").getContext("2d");
        apngTest.onload = function () {
            ctx.drawImage(apngTest, 0, 0);
            self.apngSupported = ctx.getImageData(0, 0, 1, 1).data[3] === 0;
            localStorage.setItem('apngSupported', self.apngSupported);
            if (!self.apngSupported) {
                // If we don't have apng support we're gonna load up the canvas hack. No reason to load if apng support exists.
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = 'http://backstage.berrytube.tv/marminator/apng-canvas.min.js';
                document.body.appendChild(script);
            }
        };
        apngTest.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjVEwAAAABAAAAAcMq2TYAAAANSURBVAiZY2BgYPgPAAEEAQB9ssjfAAAAGmZjVEwAAAAAAAAAAQAAAAEAAAAAAAAAAAD6A+gBAbNU+2sAAAARZmRBVAAAAAEImWNgYGBgAAAABQAB6MzFdgAAAABJRU5ErkJggg==";
        // frame 1 (skipped on apng-supporting browsers): [0, 0, 0, 255]
        // frame 2: [0, 0, 0, 0]
    }());
}
else if (apngSupported === false) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'http://backstage.berrytube.tv/marminator/apng-canvas.min.js';
    document.body.appendChild(script);
}

waitToStart();
