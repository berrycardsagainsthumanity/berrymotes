

var apply_emotes = function (chat_message) {
    var emote_regex = /\[\]\(\/([\w:!#\/]+)[-\w]*\)/g;
    var match;
    var berry_emote_map = {};
    var max = berryemotes.length;
    for (var i = 0; i < max; ++i) {
        var emote = berryemotes[i];
        for (var j = 0; j < emote.names.length; ++j) {
            if (!berry_emote_map[emote.names[j]]) {
                berry_emote_map[emote.names[j]] = i;
            }
        }
    }
    if (chat_message.match(emote_regex)) {
        while (match = emote_regex.exec(chat_message)) {
            var emote = berry_emote_map[match[1]];
            if (emote) {
                emote = berryemotes[emote];
                if(show_nsfw_emotes === false && emote.nsfw) continue;
                var pos = (emote['background-position'] || ['0px', '0px']);
                position_string = pos.join(' ');
                emote['position_string'] = position_string;
                var emote_code =
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
                console.log('Emote code: ' + emote_code);
                var replace_regex = new RegExp(['\\[\\]\\(\\/(', match[1] , ')[-\\w]*\\)'].join(''), 'g');
                chat_message = chat_message.replace(replace_regex, emote_code);
            }
        }
        chat_message = $('<span/>').append(chat_message);
        var emotes_to_resize = chat_message.find('.resize');
        $.each(emotes_to_resize, function(i, emote){
            var $emote = $(emote);
            var scale =  max_emote_height / $emote.height();
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
        return chat_message;
    }
    else
    {
        var chat_message = $('<span/>').html(chat_message);
    }
    var re = RegExp("^>");
    if(chat_message.text().match(re)) chat_message.addClass("green");
    return chat_message;
};

var monkey_patch = function () {
    return function (msg) {
        var regexp = new RegExp("(http[s]{0,1}://[^ ]*)", 'ig');
        msg = msg.replace(regexp, '<a href="$&" target="_blank">$&</a>');
        msg = apply_emotes(msg);
        var h = $('<span/>').html(msg);
        var re = new RegExp("^>");
        if (h.text().match(re)) h.addClass("green");
        return h;
    };
};

function wait_to_start() {
    if (typeof formatChatMsg === "undefined" || typeof berryemotes === "undefined") {
        setTimeout(wait_to_start, 100);
        console.log('waiting ');
    }
    else {
        formatChatMsg = monkey_patch(formatChatMsg);
        console.log('starting');
    }
};

wait_to_start();
