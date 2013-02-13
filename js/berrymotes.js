berry_emotes_enabled = typeof berry_emotes_enabled === "undefined" ? true : berry_emotes_enabled;
show_nsfw_emotes = typeof show_nsfw_emotes === "undefined" ? false : show_nsfw_emotes;
max_emote_height = typeof max_emote_height === "undefined" ? 200 : max_emote_height;
berry_emotes_debug = typeof berry_emotes_debug === "undefined" ? false : berry_emotes_debug;
berry_emote_map = {};

var emote_regex = /\[\]\(\/([\w:!#\/]+)[-\w]*\)/g;

function apply_emotes_to_str(chat_message) {
    var match;
    while (match = emote_regex.exec(chat_message)) {
        var emote = berry_emote_map[match[1]];
        if (emote) {
            emote = berryemotes[emote];
            if (show_nsfw_emotes === false && emote.nsfw) continue;
            var emote_code = get_emote_html(emote);
            if (berry_emotes_debug) console.log('Emote code: ' + emote_code);
            var replace_regex = new RegExp(['\\[\\]\\(\\/(', match[1] , ')[-\\w]*\\)'].join(''), 'g');
            chat_message = chat_message.replace(replace_regex, emote_code);
        }
    }
    return chat_message;
}

function get_emote_html(emote) {
    var position_string = (emote['background-position'] || ['0px', '0px']).join(' ');
    emote['position_string'] = position_string;
    var emote_code;
    if (apng_supported || !emote.apng) {
        emote_code =
            ['<span class="berryemote',
                emote.height > max_emote_height ? ' resize' : '',
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
        emote_code =
            ['<span class="berryemote canvasapng" ',
                'style="',
                'height:', emote.height, 'px; ',
                'width:', emote.width, 'px; ',
                'display:inline-block;',
                '" title="', emote.names, ' from ', emote.sr, '" ',
                'apng_url="', emote['apng_url'] , '"></span>'
            ].join('');
    }
    return emote_code;
}


function resize_and_animate(message) {
    if (!apng_supported) {
        var emotes_to_animate = message.find('.canvasapng');
        $.each(emotes_to_animate, function (i, emote) {
            var $emote = $(emote);
            APNG.createAPNGCanvas($emote.attr('apng_url'), function (canvas) {
                $emote.append(canvas);
            });
        });
    }

    var emotes_to_resize = message.find('.resize');
    $.each(emotes_to_resize, function (i, emote) {
        var $emote = $(emote);
        var scale = max_emote_height / $emote.height();
        var innerwrap = $emote.wrap('<div class="emote-wrapper"><div class="emote-wrapper"></div></div>').parent();
        var outerwrap = innerwrap.parent();
        outerwrap.css('height', $emote.height() * scale);
        outerwrap.css('width', $emote.width() * scale);
        outerwrap.css('display', 'inline-block');
        outerwrap.css('position', 'relative');
        innerwrap.css('transform', ['scale(', scale, ', ', scale, ')'].join(''));
        innerwrap.css('transform-origin', 'left top');
        innerwrap.css('position', 'absolute');
        innerwrap.css('top', '0');
        innerwrap.css('left', '0');
    });
}

function apply_emotes_to_chat(chat_message) {
    if (berry_emotes_enabled && chat_message.match(emote_regex)) {
        chat_message = apply_emotes_to_str(chat_message);
        chat_message = $('<span></span>').append(chat_message);
        resize_and_animate(chat_message);
        return chat_message;
    }
    else {
        chat_message = $('<span></span>').html(chat_message);
    }
    var re = new RegExp("^>");
    if (chat_message.text().match(re)) chat_message.addClass("green");
    return chat_message;
}

function monkey_patch_chat() {
    formatChatMsg = function (msg) {
        var regexp = new RegExp("(http[s]{0,1}://[^ ]*)", 'ig');
        msg = msg.replace(regexp, '<a href="$&" target="_blank">$&</a>');
        msg = apply_emotes_to_chat(msg);
        var h = $('<span/>').html(msg);
        var re = new RegExp("^>");
        if (h.text().match(re)) h.addClass("green");
        return h;
    };
}

function monkey_patch_poll() {
    var oldPoll = newPoll;
    newPoll = function (data) {
        oldPoll(data);
        var poll = $('.poll.active');
        var options = poll.find('div.label');
        $.each(options, function (i, option) {
            var $option = $(option);
            console.log(option);
            var t = $option.text().replace(">", "&gt;").replace("<", "&lt;");
            t = apply_emotes_to_str(t);
            $option.html(t);
            resize_and_animate($option);
        });
    }
}

function build_emote_map() {
    var max = berryemotes.length;
    for (var i = 0; i < max; ++i) {
        var berryemote = berryemotes[i];
        for (var j = 0; j < berryemote.names.length; ++j) {
            if (!berry_emote_map[berryemote.names[j]]) {
                berry_emote_map[berryemote.names[j]] = i;
            }
        }
    }
}

function wait_to_start() {
    if (typeof formatChatMsg === "undefined" || typeof berryemotes === "undefined" ||
        typeof apng_supported === "undefined" ||
        (apng_supported ? false : typeof APNG === "undefined")) {
        setTimeout(wait_to_start, 100);
        if (berry_emotes_debug) console.log('waiting ');
    }
    else {
        if (berry_emotes_debug) console.log('starting');
        build_emote_map();
        monkey_patch_chat();
        monkey_patch_poll();
    }
}

(function () {
    "use strict";
    var apngTest = new Image(),
        ctx = document.createElement("canvas").getContext("2d");
    apngTest.onload = function () {
        ctx.drawImage(apngTest, 0, 0);
        self.apng_supported = ctx.getImageData(0, 0, 1, 1).data[3] === 0;
        if (!self.apng_supported) {
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

wait_to_start();
