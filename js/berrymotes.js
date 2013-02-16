var berryEmotesEnabled = localStorage.getItem('berryEmotesEnabled') !== "false";
var showNsfwEmotes = localStorage.getItem('showNsfwEmotes') === "true";
var maxEmoteHeight = +localStorage.getItem('maxEmoteHeight') || 200;
var berryEmotesDebug = localStorage.getItem('berryEmotesDebug') === "true";
var apngSupported = localStorage.getItem('apngSupported');
// Leaving as none so we can test for it later on.
if (apngSupported === "false") apngSupported = false;
var berryEmoteMap = {};
var emoteRegex = /\[\]\(\/([\w:!#\/]+)[-\w]*\)/g;

function applyEmotesToStr(chatMessage) {
    var match;
    while (match = emoteRegex.exec(chatMessage)) {
        var emote_id = berryEmoteMap[match[1]];
        if (emote_id !== undefined) {
            var emote = berryEmotes[emote_id];
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
    if (apngSupported || !emote.apng_url) {
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
                '" title="', emote.names, ' from ', emote.sr, '" ',
                'emote_id="', emote.id , '"></span>'
            ].join('');
    }
    else {
        emoteCode =
            ['<span class="berryemote canvasapng',
                emote.height > maxEmoteHeight ? ' resize' : '',
                '" ',
                'style="',
                'height:', emote.height, 'px; ',
                'width:', emote.width, 'px; ',
                'display:inline-block; ',
                'position: relative; overflow: hidden;',
                '" title="', emote.names, ' from ', emote.sr, '" ',
                'emote_id="', emote.id , '"></span>'
            ].join('');
    }
    return emoteCode;
}


function postEmoteEffects(message) {
    if (!apngSupported) {
        var emotesToAnimate = message.find('.canvasapng');
        $.each(emotesToAnimate, function (i, emoteDom) {
            var $emote = $(emoteDom);
            var emote = berryEmotes[$emote.attr('emote_id')];
            APNG.createAPNGCanvas(emote.apng_url, function (canvas) {
                var position = (emote['background-position'] || ['0px', '0px']);
                var $canvas = $(canvas);
                $emote.append(canvas);
                $canvas.css('position', 'absolute');
                $canvas.css('left', position[0]);
                $canvas.css('top', position[1]);
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
            berryEmoteMap[berryemote.names[j]] = i;
            berryEmotes[i].id = i;
        }
    }
}

function injectEmoteButton() {
    whenExists('#chatControls', function () {
        if (berryEmotesDebug) console.log('Injecting settings button.');
        var settingsMenu = $('<div/>').addClass('settings').appendTo($('#chatControls')).text("Emotes");
        settingsMenu.css('margin-right', '2px');
        settingsMenu.css('background', 'url(http://backstage.berrytube.tv/marminator/bp.png) no-repeat scroll left center transparent');
        settingsMenu.click(function () {
            showBerrymoteSearch();
        });
        $(window).keydown(function(event) {
            if (!(event.keyCode == 69 && event.ctrlKey)) return true;
            showBerrymoteSearch();
            event.preventDefault();
            return false;
        });
        if (berryEmotesDebug) console.log('Settings button injected: ', settingsMenu);
    });
}

function waitToStart() {
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
        injectEmoteButton();
    }
}

var berryEmoteSearchTerm;
function showBerrymoteSearch() {
    var searchWin = $("body").dialogWindow({
        title: "BerryEmote Search",
        uid: "berryEmoteSearch",
        center: true
    });
    if (berryEmotesDebug) console.log('Search window: ', searchWin);
    var settingsMenu = $('<div style="float: right; cursor: pointer; text-decoration: underline;" />')
        .appendTo(searchWin)
        .text("Settings");
    settingsMenu.click(function () {
        showBerrymoteConfig();
    });

    var searchTimer;
    var pageSize = 50;
    var page = 0;
    var searchResults = [];
    var $searchBox = $('<input class="berrymotes_search" type="text" placeholder="Search..." />').appendTo(searchWin);
    if (berryEmoteSearchTerm) {
        $searchBox.val(berryEmoteSearchTerm);
    }
    $searchBox.focus();
    $searchBox.select();

    $('<span class="prev_page" style="cursor: pointer; text-decoration: underline;" />')
        .appendTo(searchWin)
        .text("< Prev");
    $('<span class="next_page" style="cursor: pointer; text-decoration: underline; margin-left:5px;" />')
        .appendTo(searchWin)
        .text("Next >");
    $('<span class="num_found" style="margin-left: 5px;" />')
        .appendTo(searchWin);

    var $results = $('<div class="berrymotes_search_results" style="width:500px; height: 500px; overflow-y: scroll;" ></div>').appendTo(searchWin);
    $results.on('click', '.berryemote', function (e) {
        var chatInput = $('#chatinput').find('input');
        var $emote = $(e.currentTarget);
        var emote = berryEmotes[$emote.attr('emote_id')];
        chatInput.val([chatInput.val(), '[](/', emote.names[0], ')'].join(''));
        searchWin.parent('.dialogWindow').hide();
    });

    searchWin.on('click', '.next_page, .prev_page', function (e) {
        var $button = $(e.currentTarget);
        if ($button.is('.next_page')) {
            if ((page === 0 && searchResults.length > pageSize) ||
                (page > 0 && page < Math.floor((searchResults.length / ((page) * pageSize))))) {
                page++;
            }
        }
        else if (page > 0) {
            page--;
        }
        showSearchResults();
    });

    var showSearchResults = function () {
        var max = Math.min(pageSize, searchResults.length);
        $results.html('');
        var start = page * pageSize;
        var max = Math.min(start + pageSize, searchResults.length);
        for (var i = start; i < max; ++i) {
            var emote = $('<span style="margin: 2px;" />').append(getEmoteHtml(berryEmotes[searchResults[i]]));
            postEmoteEffects(emote);
            $results.append(emote);
        }
        $('.num_found').text('Found: ' + searchResults.length);
    };

    var berryEmoteSearch = function () {
        searchResults = [];
        var term = $searchBox.val();
        berryEmoteSearchTerm = term;
        if (!term) {
            var max = berryEmotes.length;
            for (var i = 0; i < max; ++i) {
                searchResults.push(i);
            }
        }
        else {
            var isTagSearch = term.match(/^\+/);
            var isSubredditSearch = term.match(/^sr:/);
            var shittyDrunkenRegex;
            var searchField;
            if (isTagSearch) {
                shittyDrunkenRegex = new RegExp('^' + $.trim(term.substring(1)), 'i');
                searchField = 'tags';
            }
            else if (isSubredditSearch) {
                shittyDrunkenRegex = new RegExp('^' + $.trim(term.substring(3)), 'i');
                searchField = 'sr';
            }
            else {
                shittyDrunkenRegex = new RegExp(term, 'i');
                searchField = 'names';
            }
            var max = berryEmotes.length;
            for (var i = 0; i < max; ++i) {
                var emote = berryEmotes[i];
                if (showNsfwEmotes === false && emote.nsfw) continue;
                if (!emote[searchField]) continue;
                if ($.isArray(emote[searchField])) {
                    for (var j = 0; j < emote[searchField].length; ++j) {
                        if (emote[searchField][j].match(shittyDrunkenRegex)) {
                            searchResults.push(emote.id);
                            break;
                        }
                    }
                }
                else {
                    if (emote[searchField].match(shittyDrunkenRegex)) {
                        searchResults.push(emote.id);
                    }
                }
            }
        }
        page = 0;
        showSearchResults();
    };

    $searchBox.keyup(function (e) {
        clearTimeout(searchTimer);
        if (e.keyCode == 13) {
            berryEmoteSearch();
        }
        else {
            searchTimer = setTimeout(berryEmoteSearch, 250);
        }
    });

    berryEmoteSearch();

    $('<span class="prev_page" style="cursor: pointer; text-decoration: underline;" />')
        .appendTo(searchWin)
        .text("< Prev");
    $('<span class="next_page" style="cursor: pointer; text-decoration: underline; margin-left:5px;" />')
        .appendTo(searchWin)
        .text("Next >");

    searchWin.window.center();
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
