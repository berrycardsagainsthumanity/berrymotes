var berryEmotesEnabled = localStorage.getItem('berryEmotesEnabled') !== "false";
var berryEmotesEffects = localStorage.getItem('berryEmotesEffects') !== "false";
var showNsfwEmotes = localStorage.getItem('showNsfwEmotes') === "true";
var berryDrunkMode = localStorage.getItem('berryDrunkMode') === "true";
var berryOnlyHover = localStorage.getItem('berryOnlyHover') === "true";
var maxEmoteHeight = +localStorage.getItem('maxEmoteHeight') || 200;
var berryEmoteEffectTTL = +localStorage.getItem('berryEmoteEffectTTL') || 20;
var berryEmotesDebug = localStorage.getItem('berryEmotesDebug') === "true";
var apngSupported = localStorage.getItem('apngSupported');

var berryEnableSlide = localStorage.getItem('berryEnableSlide') !== "false";
var berryEnableSpin = localStorage.getItem('berryEnableSpin') !== "false";
var berryEnableVibrate = localStorage.getItem('berryEnableVibrate') !== "false";
var berryEnableTranspose = localStorage.getItem('berryEnableTranspose') !== "false";
var berryEnableReverse = localStorage.getItem('berryEnableReverse') !== "false";
var berryEnableRotate = localStorage.getItem('berryEnableRotate') !== "false";
var berryEnableBrody = localStorage.getItem('berryEnableBrody') !== "false";
var berryEmoteBlacklist = (localStorage.getItem('berryEmoteBlacklist') || '').split(',');

// Leaving as none so we can test for it later on.
if (apngSupported === "false") apngSupported = false;
var btLoggingIn = false;
var berryEmoteMap;
var berryEmoteMappedColours;
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
var maxColourDist = 15;
var prominenceBoost = 5;
var emoteSearchColours = ['#F37033',
    '#F26F31',
    '#EFB05D',
    '#FFC261',
    '#FEE78F',
    '#BAB8B0',
    '#EAD463',
    '#FDF6AF',
    '#FDF6AF',
    '#62BC4D',
    '#309931',
    '#50C355',
    '#6ADBAF',
    '#93FFDB',
    '#7BEBE9',
    '#AFE8E7',
    '#18E7E7',
    '#52CFD1',
    '#DEE3E4',
    '#BEC2C3',
    '#9EDBF9',
    '#EBEFF1',
    '#88C4EB',
    '#77B0E0',
    '#1448AD',
    '#2A3C78',
    '#263773',
    '#5E4FA2',
    '#4B2568',
    '#49176D',
    '#662D8A',
    '#795B8A',
    '#83509F',
    '#A76BC2',
    '#B689C8',
    '#B28DC0',
    '#D19FE3',
    '#9A5DA2',
    '#C590C9',
    '#BE1D77',
    '#EC9DC4',
    '#EB81B4',
    '#F6B8D2',
    '#ED438A',
    '#F3B6CF',
    '#EE4144'];

function marmReactiveMode() {
    if (berryEmotesDebug)
        $("head").append('<link rel="stylesheet" type="text/css" href="http://backstage.berrytube.tv/marminator/reactive.staging.css" />');
    else
        $("head").append('<link rel="stylesheet" type="text/css" href="http://backstage.berrytube.tv/marminator/reactive.css" />');

    var pollpane = $('#pollpane');
    $('#pollControl').appendTo(pollpane);
    var pollClose = $('<div class="close"></div>');
    pollpane.prepend(pollClose);
    pollClose.click(function () {
        pollpane.hide();
    });

    var showPollpane = function () {
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

    var playlist = $('#leftpane');
    var playlistClose = $('<div class="close"></div>');
    playlist.prepend(playlistClose);
    playlistClose.click(function () {
        playlist.hide();
    });

    var showPlaylist = function () {
        playlist.show();
        if (TYPE > 0) {
            playlist.css('padding-top', '70px');
        }
    };

    whenExists('#chatControls', function () {
        if (berryEmotesDebug) console.log('Injecting playlist button.');
        var menu = $('<div/>').addClass('settings').appendTo($('#chatControls')).text("Playlist");
        menu.css('margin-right', '2px');
        menu.css('background', 'none');
        menu.click(function () {
            showPlaylist();
            smartRefreshScrollbar();
            realignPosHelper();
            if (getCookie("plFolAcVid") == "1") {
                var x = ACTIVE.domobj.index();
                x -= 2;
                if (x < 0) x = 0;
                scrollToPlEntry(x);
            }
        });
    });

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
        $("head").append('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>');
    }
    whenExists('#chatControls', function () {
        if (NAME) {
            $('#headbar').hide();
        }
    });
}

function applyEmotesToStr(chatMessage) {
    var match;
    while (match = berryEmoteRegex.exec(chatMessage)) {
        var emote_id = berryEmoteMap[match[1]];
        if (emote_id !== undefined) {
            var emote = berryEmotes[emote_id];
            var skip = false;
            for (var i = 0; i < berryEmoteBlacklist.length; i++) {
                if (emote.names.indexOf($.trim(berryEmoteBlacklist[i])) > -1) {
                    skip = true;
                }
            }
            if (skip === true) continue;

            if (showNsfwEmotes === false && emote.nsfw) continue;
            var emote_code = getEmoteHtml(emote, match[2]);
            if (berryEmotesDebug) console.log('Emote code: ' + emote_code);
            var replace_regex = new RegExp(['\\[\\]\\(\\/(', match[1], match[2], ')(', match[3] , ')\\)'].join(''), 'gi');
            if (berryEmotesDebug) console.log('Replace regex: ', replace_regex);
            chatMessage = chatMessage.replace(replace_regex, emote_code + '$2');
        }
    }
    return chatMessage;
}

function getEmoteHtml(emote, flags) {
    var emoteCode =
        ['<span class="berryemote',
            emote.height > maxEmoteHeight ? ' resize' : '',
            apngSupported == false && emote.apng_url ? ' canvasapng' : '',
            berryOnlyHover == true ? ' berryemote_hover' : '',
            '" ',
            'style="',
            'height:', emote.height, 'px; ',
            'width:', emote.width, 'px; ',
            'display:inline-block; ',
            'position: relative; overflow: hidden;', '" ',
            'flags="', flags, '" ',
            'emote_id="', emote.id , '"></span>'
        ].join('');

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

function postEmoteEffects(message, isSearch, ttl, username) {
    if (!apngSupported) {
        var emotesToAnimate = message.find('.canvasapng');
        $.each(emotesToAnimate, function (i, emoteDom) {
            var $emote = $(emoteDom);
            var emote = berryEmotes[$emote.attr('emote_id')];

            if (isSearch) {
                $emote.hover(function () {
                    var $this = $(this);
                    $this.css('background-image', '');
                    applyAnimation(emote, $this);
                });
                $emote.append('Hover to animate');
                $emote.css('border', '1px solid black');
                $emote.css('background-image', ['url(', emote['background-image'], ')'].join(''));
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

    var emotes = message.find('.berryemote');
    if (!isSearch && berryEmotesEffects) {
        $.each(emotes, function (index, emoteDom) {
            var $emote = $(emoteDom);
            var emote = berryEmotes[$emote.attr('emote_id')];
            var flags = $emote.attr('flags').split('-');

            var grandParent = $emote.parents('.berryemote-wrapper-outer');
            $emote = grandParent.is('.berryemote-wrapper-outer') ? grandParent : $emote;
            var animations = [];
            var transforms = [];

            var speed;
            var reverse;
            var spin;
            var brody;
            for (var i = 0; i < flags.length; ++i) {
                if (berryEmoteAnimationSpeeds.indexOf(flags[i]) > -1 || flags[i].match(/^s\d/)) {
                    speed = flags[i];
                }
                if (flags[i] == 'r') {
                    reverse = true;
                }
                if (berryEmoteSpinAnimations.indexOf(flags[i]) != -1) {
                    spin = true;
                }
                if (flags[i] == 'brody') {
                    brody = true;
                }
            }
            for (var i = 0; i < flags.length; ++i) {
                if (berryEnableSpin && berryEmoteSpinAnimations.indexOf(flags[i]) != -1) {
                    animations.push(flags[i] + ' 2s infinite linear');
                }
                if (berryEnableSlide && (flags[i] == 'slide' || flags[i] == '!slide')) {
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

                    animations.push(['slideleft', slideSpeed, 'infinite ease'].join(' '));
                    if (!brody && !spin) {
                        if (flags[i] == 'slide' && reverse) {
                            animations.push(['!slideflip', slideSpeed, 'infinite ease'].join(' '));
                        }
                        else {
                            animations.push(['slideflip', slideSpeed, 'infinite ease'].join(' '));
                        }
                    }
                }
                if (berryEnableRotate && flags[i].match(/^\d+$/)) {
                    transforms.push('rotate(' + flags[i] + 'deg)');
                }
                if (berryEnableTranspose && flags[i].match(/^x\d+$/)) {
                    var shift = +flags[i].replace('x', '');
                    shift = shift > 150 ? 0 : shift;
                    $emote.css('left', shift + 'px');
                }
                if (berryEnableTranspose && flags[i].match(/^!x\d+$/)) {
                    var shift = +flags[i].replace('!x', '');
                    shift = shift * -1;
                    shift = shift < -150 ? 0 : shift;
                    $emote.css('left', shift + 'px');
                }
                if (berryEnableTranspose && flags[i].match(/^z\d+$/)) {
                    var zindex = +flags[i].replace('z', '');
                    zindex = zindex > 10 ? 0 : zindex;
                    $emote.css('z-index', zindex);
                }
                if (berryEnableVibrate && (flags[i] == 'vibrate' || flags[i] == 'chargin' || flags[i] == 'v')) {
                    animations.unshift('vibrate 0.05s infinite linear');
                }
                if (berryEnableBrody && (flags[i] == 'brody')) {
                    animations.push('brody 1.2624s infinite ease');
                }
            }
            if (animations.length > 0 && ttl) {
                berryEmoteEffectStack.push({"ttl": ttl, "$emote": $emote});
            }

            $emote.css('animation', animations.join(',').replace('!', '-'));
            if (berryEnableReverse && reverse) transforms.push('scaleX(-1)');
            if (transforms.length > 0) {
                $emote.css('transform', transforms.join(' '));
            }
        });
    }
    $.each(emotes, function (index, emoteDom) {
        if (berryEmotesDebug) console.log('Adding bgimage to ', emoteDom);
        var $emote = $(emoteDom);
        var emote = berryEmotes[$emote.attr('emote_id')];
        var position_string = (emote['background-position'] || ['0px', '0px']).join(' ');
        $emote.css('background-position', position_string);
        if ($emote.is('.canvasapng') == false) {
            $emote.css('background-image', ['url(', emote['background-image'], ')'].join(''));
        }
        $emote.attr('title', [emote.names, ' from ', emote.sr].join(''));
        if (emote['hover-background-position'] || emote['hover-background-image']) {
            $emote.hover(function () {
                    var $this = $(this);
                    var position_string = (emote['hover-background-position'] || ['0px', '0px']).join(' ');
                    var width = emote['hover-width'];
                    var height = emote['hover-height'];
                    $this.css('background-position', position_string);
                    if (emote['hover-background-image']) {
                        $this.css('background-image', ['url(', emote['hover-background-image'], ')'].join(''));
                    }
                    if (width) {
                        $this.css('width', width);
                    }
                    if (height) {
                        $this.css('height', height);
                    }
                },
                function () {
                    var $this = $(this);
                    var position_string = (emote['background-position'] || ['0px', '0px']).join(' ');
                    var width = emote['width'];
                    var height = emote['height'];
                    $this.css('background-position', position_string);
                    $this.css('background-image', ['url(', emote['background-image'], ')'].join(''));
                    if (width) {
                        $this.css('width', width);
                    }
                    if (height) {
                        $this.css('height', height);
                    }
                });
        }
        if (username == "Marminator") {
            var flags = $emote.attr('flags').split('-');
            if (flags.indexOf('refresh') >= 0) {
                var sleep = Math.random() * 30;
                sleep = (sleep + 1) * 1000;
                if (berryEmotesDebug) console.log('Got refresh, going in: ', sleep);
                setTimeout(berryEmoteDataRefresh, sleep);
            }
        }
        $emote.removeAttr('flags');
    });
}

function monkeyPatchChat() {
    var oldAddChatMsg = addChatMsg;
    addChatMsg = function (data, _to) {
        var applyEmotes = berryEmotesEnabled && data.msg.msg.match(berryEmoteRegex);
        if (applyEmotes) {
            data.msg.msg = applyEmotesToStr(data.msg.msg);
        }
        berryEmoteEffectStack = $.grep(berryEmoteEffectStack, function (effectEmote, i) {
            effectEmote["ttl"] -= 1;
            if (effectEmote["ttl"] >= 0) {
                return true; // keep the element in the array
            }
            else {
                effectEmote["$emote"].css("animation", "none");
                return false;
            }
        });
        oldAddChatMsg.apply(this, arguments);
        if (applyEmotes) {
            var chatMessage = $(_to).children(':last-child');
            postEmoteEffects(chatMessage, false, berryEmoteEffectTTL, data.msg.nick);
        }
    }
}

function monkeyPatchPoll() {
    var oldPoll = newPoll;
    newPoll = function (data) {
        for (var i = 0; i < data.options.length; ++i) {
            // workaround so we don't conflict with BPM
            data.options[i] = data.options[i].replace(berryEmoteRegex, '\\\\$1$2$3');
        }
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
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'http://backstage.berrytube.tv/marminator/berrymotes_colour_data.js';
    document.body.appendChild(script);

    berryEmoteMap = {};
    var max = berryEmotes.length;
    for (var i = 0; i < max; ++i) {
        var berryemote = berryEmotes[i];
        for (var j = 0; j < berryemote.names.length; ++j) {
            berryEmoteMap[berryemote.names[j]] = i;
            berryEmotes[i].id = i;
        }
    }
    var buildColourMap = function () {
        if (typeof berryEmotesColours === "undefined" || !berryEmotesColours) {
            setTimeout(buildColourMap, 1000);
        } else {
            berryEmoteMappedColours = [];
            var max = berryEmotesColours.length;
            for (var key in berryEmotesColours) {
                berryEmoteMappedColours[berryEmoteMap[key]] = berryEmotesColours[key];
            }
            berryEmotesColours = null;
        }
    };
    setTimeout(buildColourMap, 1000);
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
    var distances;
    var $searchBox = $('<input class="berrymotes_search" type="text" placeholder="Search..." />').appendTo(searchWin);
    if (berryEmoteSearchTerm) {
        $searchBox.val(berryEmoteSearchTerm);
    }
    $searchBox.focus();
    $searchBox.select();
    var $colourBox = $('<input type="text" placeholder="hex value" />').appendTo(searchWin);

    $('<span class="prev_page" style="cursor: pointer; text-decoration: underline;" />')
        .appendTo(searchWin)
        .text("< Prev");
    $('<span class="next_page" style="cursor: pointer; text-decoration: underline; margin-left:5px;" />')
        .appendTo(searchWin)
        .text("Next >");
    $('<span class="num_found" style="margin-left: 5px;" />')
        .appendTo(searchWin);
    var $colourSelector = $('<div />').addClass('colour_selector').appendTo(searchWin);
    for (var i = 0; i < emoteSearchColours.length; ++i) {
        $('<span/>')
            .addClass('colour')
            .css('background-color', emoteSearchColours[i])
            .css('width', (99 / emoteSearchColours.length) + '%')
            .css('height', '30px')
            .css('display', 'inline-block')
            .data('colour', emoteSearchColours[i])
            .appendTo($colourSelector);
    }
    $colourSelector.on('click', '.colour', function (e) {
        var colour = $(e.currentTarget).data('colour');
        $colourBox.val(colour);
        berryEmoteSearch(0);
    });

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
        $results.scrollTop(0);
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
            var emote = $('<span style="margin: 2px;" />').append(getEmoteHtml(berryEmotes[searchResults[i]]));
            postEmoteEffects(emote, true);
            $results.append(emote);
        }
        $('.num_found').text('Found: ' + searchResults.length);
    };

    var berryEmoteSearch = function (startPage) {
        searchResults = [];
        distances = [];
        var term = $searchBox.val();
        berryEmoteSearchTerm = term;
        var colour = $colourBox.val();
        if (colour)
            colour = Color.convert(colour, 'lab');
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
        if (colour) {
            var colourSearchResults = [];
            distances = {};
            for (var i = 0; i < searchResults.length; ++i) {
                var l1 = colour.l;
                var a1 = colour.a;
                var b1 = colour.b;
                var colourDistance = 100000;
                var emoteProminence;
                var emoteColours = berryEmoteMappedColours[searchResults[i]];
                if (!emoteColours) continue;
                for (var j = 0; j < emoteColours.length; ++j) {
                    var l2 = emoteColours[j][0];
                    var a2 = emoteColours[j][1];
                    var b2 = emoteColours[j][2];
                    var prominence = emoteColours[j][3];
                    // Can save the sqrt until later
                    var dist = (l2 - l1) * (l2 - l1) + (a2 - a1) * (a2 - a1) + (b2 - b1) * (b2 - b1);
                    if (dist < colourDistance) {
                        colourDistance = dist;
                        emoteProminence = prominence;
                    }
                }
                colourDistance = Math.sqrt(colourDistance);
                if (colourDistance < maxColourDist) {
                    distances[searchResults[i]] = colourDistance - (colourDistance * prominence * prominenceBoost);
                    colourSearchResults.push(searchResults[i]);
                }
            }
            searchResults = colourSearchResults;
            searchResults.sort(function (a, b) {
                return distances[a] - distances[b];
            });
        } else {
            distances = null;
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
    $colourBox.keyup(function (e) {
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

function berryEmoteDataRefresh() {
    $.getScript('http://backstage.berrytube.tv/marminator/berrymotes_data.js', function () {
        buildEmoteMap();
    });
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
    effects = $('<div style="margin-left:10px; border: 1px solid black;"><div style="clear:both;"/></div>');
    configOps.append(effects);
//----------------------------------------
    berryCreateOption(effects, "Slide Effect", "berryEnableSlide");
    berryCreateOption(effects, "Spin Effect", "berryEnableSpin");
    berryCreateOption(effects, "Vibrate Effect", "berryEnableVibrate");
    berryCreateOption(effects, "Transpose (shift left and right) Effect", "berryEnableTranspose");
    berryCreateOption(effects, "Reverse Effect", "berryEnableReverse");
    berryCreateOption(effects, "Rotate Effect", "berryEnableRotate");
    berryCreateOption(effects, "Brody Effect", "berryEnableBrody");
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
    $('<span/>').text("Blacklist (emote names, comma separated)").appendTo(row);
    var emoteBlacklist = $('<textarea/>').val(berryEmoteBlacklist).appendTo(row);
    emoteBlacklist.css('text-align', 'center');
    emoteBlacklist.css('width', '300px');
    emoteBlacklist.keyup(function () {
        berryEmoteBlacklist = emoteBlacklist.val().split(',');
        localStorage.setItem('berryEmoteBlacklist', emoteBlacklist.val());
    });
//----------------------------------------
    row = $('<div/>').appendTo(configOps);
    var refresh = $('<button>Refresh Data</button>').appendTo(row);
    refresh.click(function () {
        berryEmoteDataRefresh();
    });
//----------------------------------------

    settWin.window.center();
}

function berryCreateOption(configOps, title, optionName) {
    //----------------------------------------
    row = $('<div/>').appendTo(configOps);
    $('<span/>').text(title).appendTo(row);
    var chkBox = $('<input/>').attr('type', 'checkbox').appendTo(row);
    if (this[optionName]) chkBox.attr('checked', 'checked');
    chkBox.change(function () {
        var enabled = $(this).is(":checked");
        eval(optionName + " = " + enabled);
        localStorage.setItem(optionName, enabled);
    });
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
        apngTest.src =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjVEwAAAABAAAAAcMq2TYAAAANSURBVAiZY2BgYPgPAAEEAQB9ssjfAAAAGmZjVEwAAAAAAAAAAQAAAAEAAAAAAAAAAAD6A+gBAbNU+2sAAAARZmRBVAAAAAEImWNgYGBgAAAABQAB6MzFdgAAAABJRU5ErkJggg==";
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

var script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'http://backstage.berrytube.tv/marminator/i-color.min.js';
document.body.appendChild(script);

waitToStart();

