var berryEmotesEnabled = localStorage.getItem('berryEmotesEnabled') !== "false";
var berryEmotesEffects = localStorage.getItem('berryEmotesEffects') !== "false";
var showNsfwEmotes = localStorage.getItem('showNsfwEmotes') === "true";
var berryDrunkMode = localStorage.getItem('berryDrunkMode') === "true";
var berryOnlyHover = localStorage.getItem('berryOnlyHover') === "true";
var maxEmoteHeight = +localStorage.getItem('maxEmoteHeight') || 200;
var berryEmoteEffectTTL = +localStorage.getItem('berryEmoteEffectTTL') || 20;
var berryEmotesDebug = localStorage.getItem('berryEmotesDebug') === "true";
var apngSupported = localStorage.getItem('apngSupported');
// Leaving as none so we can test for it later on.
if (apngSupported === "false") apngSupported = false;
var btLoggingIn = false;
var berryEmoteMap;
var berryEmoteRegex = /\[\]\(\/([\w:!#\/]+)([-\w!]*)([^)]*)\)/gi;
var berryEmoteSearchTerm;
var berryEmotePage = 0;
var berryEmoteEffectStack = [];
var berryEmoteSpinAnimations = ['spin', 'zspin', 'xspin', 'yspin', '!spin', '!zspin', '!xspin', '!yspin'];
var berryEmoteAnimationSpeeds = ['slowest', 'slower', 'slow', 'fast', 'faster', 'fastest'];
var berryEmoteAnimationSpeedMap = {
    'slowest': '14s',
    'slower': '12s',
    'slow': '10s',
    'fast': '6s',
    'faster': '4s',
    'fastest': '2s'
};


function marmReactiveMode() {
    if(berryEmotesDebug)
        $("head").append('<link rel="stylesheet" type="text/css" href="http://backstage.berrytube.tv/marminator/reactive.staging.css" />');
    else
        $("head").append('<link rel="stylesheet" type="text/css" href="http://backstage.berrytube.tv/marminator/reactive.css" />');
    var playlist = $('#leftpane');
    var playlistClose = $('<div class="close"></div>');
    playlist.prepend(playlistClose);
    playlistClose.click(function(){
        playlist.hide();
    });
    
    var showPlaylist = function(){
        playlist.show();
    };
    
    whenExists('#chatControls', function () {
        if (berryEmotesDebug) console.log('Injecting playlist button.');
        var menu = $('<div/>').addClass('settings').appendTo($('#chatControls')).text("Playlist");
        menu.css('margin-right', '2px');
        menu.css('background', 'none');
        menu.click(function () {
            showPlaylist();
            smartRefreshScrollbar();
        });
    });
        
    var pollpane = $('#pollpane');
    $('#pollControl').appendTo(pollpane);
    var pollClose = $('<div class="close"></div>');
    pollpane.prepend(pollClose);
    pollClose.click(function(){
        pollpane.hide();
    });
    
    var showPollpane = function(){
        pollpane.show();
    };
    
    whenExists('#chatControls', function () {
        if (berryEmotesDebug) console.log('Injecting poll button.');
        var menu = $('<div/>').addClass('settings').appendTo($('#chatControls')).text("Poll");
        menu.css('margin-right', '2px');
        menu.css('background', 'none');
        menu.click(function () {
            showPollpane();
        });
    });
}

function applyEmotesToStr(chatMessage) {
    var match;
    while (match = berryEmoteRegex.exec(chatMessage)) {
        var emote_id = berryEmoteMap[match[1]];
        if (emote_id !== undefined) {
            var emote = berryEmotes[emote_id];
            if (showNsfwEmotes === false && emote.nsfw) continue;
            var emote_code = getEmoteHtml(emote, false, match[2]);
            if (berryEmotesDebug) console.log('Emote code: ' + emote_code);
            var replace_regex = new RegExp(['\\[\\]\\(\\/(', match[1], ')([-\\w!]*)([^)]*)\\)'].join(''), 'gi');
            chatMessage = chatMessage.replace(replace_regex, emote_code + '$3');
        }
    }
    return chatMessage;
}

function getEmoteHtml(emote, isSearch, flags) {
    var position_string = (emote['background-position'] || ['0px', '0px']).join(' ');
    emote['position_string'] = position_string;
    var emoteCode;
    if (apngSupported || !emote.apng_url || isSearch) {
        emoteCode =
            ['<span class="berryemote',
                emote.height > maxEmoteHeight ? ' resize' : '',
                apngSupported == false && emote.apng_url ? ' canvasapng' : '',
                berryOnlyHover == true ? ' berryemote_hover' : '',
                '" ',
                'style="',
                'background-image: url(', emote['background-image'], '); ',
                'height:', emote.height, 'px; ',
                'width:', emote.width, 'px; ',
                'background-position:', position_string, '; ',
                'display:inline-block; ',
                'position: relative; overflow: hidden;',
                '" title="', emote.names, ' from ', emote.sr, '" ',
                'flags="', flags, '" ',
                'emote_id="', emote.id , '"></span>'
            ].join('');
    }
    else {
        emoteCode =
            ['<span class="berryemote canvasapng',
                emote.height > maxEmoteHeight ? ' resize' : '',
                berryOnlyHover == true ? ' berryemote_hover' : '',
                '" ',
                'style="',
                'height:', emote.height, 'px; ',
                'width:', emote.width, 'px; ',
                'display:inline-block; ',
                'position: relative; overflow: hidden;',
                '" title="', emote.names, ' from ', emote.sr, '" ',
                'flags="', flags, '" ',
                'emote_id="', emote.id , '"></span>'
            ].join('');
    }
    return emoteCode;
}

function applyAnimation(emote, $emote) {
    APNG.createAPNGCanvas(emote.apng_url, function (canvas) {
        var position = (emote['background-position'] || ['0px', '0px']);
        var $canvas = $(canvas);
        $emote.append(canvas);
        $canvas.css('position', 'absolute');
        $canvas.css('left', position[0]);
        $canvas.css('top', position[1]);
    });
}

function postEmoteEffects(message, isSearch) {
    if (!apngSupported) {
        var emotesToAnimate = message.find('.canvasapng');
        $.each(emotesToAnimate, function (i, emoteDom) {
            var $emote = $(emoteDom);
            var emote = berryEmotes[$emote.attr('emote_id')];

            if (isSearch) {
                $emote.hover(function () {
                    $emote.css('background-image', '');
                    applyAnimation(emote, $emote);
                });
                $emote.append('Hover to animate');
                $emote.css('border', '1px solid black');

            } else {
                applyAnimation(emote, $emote);
            }
        });
    }

    var emotesToResize = message.find('.resize');
    $.each(emotesToResize, function (i, emoteDom) {
        var $emote = $(emoteDom);
        var scale = maxEmoteHeight / $emote.height();
        var innerWrap = $emote.wrap('<span class="berryemote-wrapper-outer"><span class="berryemote-wrapper-inner"></span></span>').parent();
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

    if (berryOnlyHover && !isSearch) {
        var emotesToHover = message.find('.berryemote_hover');
        $.each(emotesToHover, function (index, emoteDom) {
            var $emote = $(emoteDom);
            var emote = berryEmotes[$emote.attr('emote_id')];
            var emoteName = "";
            for (var i = 0; i < emote.names.length; ++i) {
                if (emote.names[i].length > emoteName.length) {
                    emoteName = emote.names[i];
                }
            }
            var grandParent = $emote.parents('.berryemote-wrapper-outer');
            $emote = grandParent.is('.berryemote-wrapper-outer') ? grandParent : $emote;
            var wrap = $emote.wrap('<span class="berryemote_hover"/>').parent();
            wrap.append([
                '<span class="berryemote_placeholder">',
                '[](/', emoteName, ')',
                , '</span>'].join(''));
        });
    }
    if (!isSearch && berryEmotesEffects) {
        var emotes = message.find('.berryemote');
        $.each(emotes, function (index, emoteDom) {
            var $emote = $(emoteDom);
            var emote = berryEmotes[$emote.attr('emote_id')];
            var flags = $emote.attr('flags').split('-');
            $emote.removeAttr('flags');

            var grandParent = $emote.parents('.berryemote-wrapper-outer');
            $emote = grandParent.is('.berryemote-wrapper-outer') ? grandParent : $emote;
            var animations = [];

            var speed;
            var reverse;
            for (var i = 0; i < flags.length; ++i) {
                if (berryEmoteAnimationSpeeds.indexOf(flags[i]) > -1 || flags[i].match(/^s\d/)) {
                    speed = flags[i];
                }
                if (flags[i] == 'r') {
                    reverse = true;
                }
            }
            for (var i = 0; i < flags.length; ++i) {
                if (berryEmoteSpinAnimations.indexOf(flags[i]) != -1) {
                    animations.push(flags[i] + ' 2s infinite linear');
                }
                if (flags[i] == 'slide' || flags[i] == '!slide') {
                    var slideSpeed = '8s';
                    if (speed) {
                        if (speed.match(/^s\d/)) {
                            slideSpeed = speed.replace('s', '') + 's';
                        }
                        else {
                            slideSpeed = berryEmoteAnimationSpeedMap[speed];
                            if (!slideSpeed) slideSpeed = '8s';
                        }
                    }
                    if (flags[i] == 'slide' && reverse)
                        animations.push(['!slide', slideSpeed, 'infinite ease'].join(' '));
                    else
                        animations.push([flags[i], slideSpeed, 'infinite ease'].join(' '));
                }
                if (flags[i].match(/^\d+$/)) {
                    $emote.css('transform', 'rotate(' + flags[i] + 'deg)');
                }
                if (flags[i].match(/^x\d+$/)) {
                    var shift = +flags[i].replace('x', '');
                    shift = shift > 150 ? 0 : shift;
                    $emote.css('left', shift + 'px');
                }
                if (flags[i].match(/^!x\d+$/)) {
                    var shift = +flags[i].replace('!x', '');
                    shift = shift * -1;
                    shift = shift < -150 ? 0 : shift;
                    $emote.css('left', shift + 'px');
                }
                if (flags[i].match(/^z\d+$/)) {
                    var zindex = +flags[i].replace('z', '');
                    zindex = zindex > 10 ? 0 : zindex;
                    $emote.css('z-index', zindex);
                }
            }
            if(animations.length > 0){
                berryEmoteEffectStack.push({"ttl": berryEmoteEffectTTL, "$emote": $emote});
            }
            $emote.css('animation', animations.join(',').replace('!', '-'));
            if (reverse) $emote.css('transform', 'scaleX(-1)');
        });
    }
}

function applyEmotesToChat(chatMessage) {
    if (berryEmotesEnabled && chatMessage.match(berryEmoteRegex)) {
        chatMessage = applyEmotesToStr(chatMessage);
        chatMessage = $('<span style="position: relative;"></span>').append(chatMessage);
        postEmoteEffects(chatMessage);
        return chatMessage;
    }
    else {
        chatMessage = $('<span style="position: relative;"></span>').html(chatMessage);
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
        berryEmoteEffectStack = $.grep(berryEmoteEffectStack, function (effectEmote, i) {
            effectEmote["ttl"] -= 1;
            if(effectEmote["ttl"] >= 0) {
                return true; // keep the element in the array
            }
            else {
                effectEmote["$emote"].css("animation", "none");
                return false;
            }
        });
        
        return h;
    };
}

function monkeyPatchPoll() {
    var oldPoll = newPoll;
    newPoll = function (data) {
        oldPoll(data);
        var poll = $('.poll.active');
        var options = poll.find('div.label, .title');
        $.each(options, function (i, option) {
            var $option = $(option);
            if (berryEmotesDebug) console.log(option);
            var t = $option.text().replace(">", "&gt;").replace("<", "&lt;");
            t = t.replace(/\\\\([\w-]+)/i, '[](/$1)');
            t = applyEmotesToStr(t);
            $option.html(t);
            $option.css('position', 'relative');
            postEmoteEffects($option);
        });

    }
}

function monkeyPatchTabComplete() {
    var oldTabComplete = tabComplete;
    tabComplete = function (elem) {
        var chat = elem.val();
        var ts = elem.data('tabcycle');
        var i = elem.data('tabindex');
        var hasTS = false;

        if (typeof ts != "undefined" && ts != false) hasTS = true;

        if (hasTS == false) {
            console.log("New Tab");
            var endword = /\\\\([^ ]+)$/i;
            var m = chat.match(endword);
            if (m) {
                var emoteToComplete = m[1];
                if (berryEmotesDebug) console.log('Found emote to tab complete: ', emoteToComplete)
            } else {
                return oldTabComplete(elem);
            }

            var re = new RegExp('^' + emoteToComplete + '.*', 'i');

            var ret = [];
            for (var i in berryEmoteMap) {
                if (!showNsfwEmotes && berryEmotes[berryEmoteMap[i]].nsfw) continue;
                var m = i.match(re);
                if (m) ret.push(m[0]);
            }
            ret.sort();

            if (ret.length == 1) {
                var x = chat.replace(endword, '\\\\' + ret[0]);
                elem.val(x);
            }
            if (ret.length > 1) {
                var ts = [];
                for (var i in ret) {
                    var x = chat.replace(endword, '\\\\' + ret[i]);
                    ts.push(x);
                }
                elem.data('tabcycle', ts);
                elem.data('tabindex', 0);
                hasTS = true;
                console.log(elem.data());
            }
        }

        if (hasTS == true) {
            console.log("Cycle");
            var ts = elem.data('tabcycle');
            var i = elem.data('tabindex');
            elem.val(ts[i]);
            if (++i >= ts.length) i = 0;
            elem.data('tabindex', i);
        }

        return ret
    };
}

function buildEmoteMap() {
    berryEmoteMap = {};
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
        $(window).keydown(function (event) {
            if ((event.keyCode == 69 && event.ctrlKey) ||
                (berryDrunkMode && event.ctrlKey && (event.keyCode == 87 || event.keyCode == 82)) ||
                (event.keyCode == 27 && $('.berrymotes_search_results').length)) {
                if ($('.berrymotes_search_results').length) {
                    $('.dialogWindow').remove();
                }
                else {
                    showBerrymoteSearch();
                }
                event.preventDefault();
                return false;
            }
            return true;
        });
        window.onbeforeunload = function () {
            if (berryDrunkMode && !btLoggingIn) {
                return "Are you sure you want to navigate away?";
            }
            // not in drunk mode, just let it happen.
            return null;
        };

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
        if (berryEmotesDebug) {
            $("head").append('<link rel="stylesheet" type="text/css" ' +
                'href="http://backstage.berrytube.tv/marminator/berryemotecore.staging.css" />');
        }
        else {
            $("head").append('<link rel="stylesheet" type="text/css" ' +
                'href="http://backstage.berrytube.tv/marminator/berryemotecore.css" />');
        }
        buildEmoteMap();
        monkeyPatchChat();
        monkeyPatchPoll();
        monkeyPatchTabComplete();
        injectEmoteButton();
        $('form').submit(function () {
            btLoggingIn = true;
        });
    }
}

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
        searchWin.parent('.dialogWindow').remove();
        chatInput.focus();
    });

    searchWin.on('click', '.next_page, .prev_page', function (e) {
        var $button = $(e.currentTarget);
        if ($button.is('.next_page')) {
            if ((page === 0 && searchResults.length > pageSize) ||
                (page > 0 && Math.floor((searchResults.length - (page * pageSize)) / pageSize) > 0)) {
                page++;
                berryEmotePage = page;
            }
        }
        else if (page > 0) {
            page--;
            berryEmotePage = page;
        }
        showSearchResults();
    });

    var showSearchResults = function () {
        var max = Math.min(pageSize, searchResults.length);
        $results.empty();
        var start = page * pageSize;
        var max = Math.min(start + pageSize, searchResults.length);
        for (var i = start; i < max; ++i) {
            var emote = $('<span style="margin: 2px;" />').append(getEmoteHtml(berryEmotes[searchResults[i]], true));
            postEmoteEffects(emote, true);
            $results.append(emote);
        }
        $('.num_found').text('Found: ' + searchResults.length);
    };

    var berryEmoteSearch = function (startPage) {
        searchResults = [];
        var term = $searchBox.val();
        berryEmoteSearchTerm = term;
        if (!term) {
            var max = berryEmotes.length;
            for (var i = 0; i < max; ++i) {
                var emote = berryEmotes[i];
                if (showNsfwEmotes === false && emote.nsfw) continue;
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
        page = startPage;
        showSearchResults();
    };

    $searchBox.keyup(function (e) {
        clearTimeout(searchTimer);
        if (e.keyCode == 13) {
            berryEmoteSearch(0);
        }
        // don't search if they release control otherwise the shortcut loses your page#
        else if (e.keyCode != 17) {
            searchTimer = setTimeout(function () {
                berryEmoteSearch(0);
            }, 250);
        }
    });

    berryEmoteSearch(berryEmotePage);

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
    $('<span/>').text("Drunk mode (prevents accidental navigation): ").appendTo(row);
    var drunkMode = $('<input/>').attr('type', 'checkbox').appendTo(row);
    if (berryDrunkMode) drunkMode.attr('checked', 'checked');
    drunkMode.change(function () {
        var enabled = $(this).is(":checked");
        berryDrunkMode = enabled;
        localStorage.setItem('berryDrunkMode', enabled);
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("Only show emotes on hover: ").appendTo(row);
    var cadesBeardMode = $('<input/>').attr('type', 'checkbox').appendTo(row);
    if (berryOnlyHover) cadesBeardMode.attr('checked', 'checked');
    cadesBeardMode.change(function () {
        var enabled = $(this).is(":checked");
        berryOnlyHover = enabled;
        localStorage.setItem('berryOnlyHover', enabled);
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("Enable extra effects: ").appendTo(row);
    var effects = $('<input/>').attr('type', 'checkbox').appendTo(row);
    if (berryEmotesEffects) effects.attr('checked', 'checked');
    effects.change(function () {
        var enabled = $(this).is(":checked");
        berryEmotesEffects = enabled;
        localStorage.setItem('berryEmotesEffects', enabled);
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("Max Height:").appendTo(row);
    var maxHeight = $('<input/>').attr('type', 'text').val(maxEmoteHeight).addClass("small").appendTo(row);
    maxHeight.css('text-align', 'center');
    maxHeight.css('width', '30px');
    maxHeight.keyup(function () {
        maxEmoteHeight = maxHeight.val();
        localStorage.setItem('maxEmoteHeight', maxHeight.val());
    });
    $('<span/>').text("pixels.").appendTo(row);
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text("Max chat lines to keep effects running on (saves CPU):").appendTo(row);
    var chatTTL = $('<input/>').attr('type', 'text').val(berryEmoteEffectTTL).addClass("small").appendTo(row);
    chatTTL.css('text-align', 'center');
    chatTTL.css('width', '30px');
    chatTTL.keyup(function () {
        berryEmoteEffectTTL = chatTTL.val();
        localStorage.setItem('berryEmoteEffectTTL', chatTTL.val());
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    var refresh = $('<button>Refresh Data</button>').appendTo(row);
    refresh.click(function () {
        $.getScript('http://backstage.berrytube.tv/marminator/berrymotes_data.js', function () {
            buildEmoteMap();
        });
    });
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
