Bem = typeof Bem === "undefined" ? {} : Bem;
(function ($) {
    var settings_schema = [
        { key: 'enabled', type: "bool", default: true },
        { key: 'effects', type: "bool", default: true },
        { key: 'showNsfwEmotes', type: "bool", default: false },
        { key: 'onlyHover', type: "bool", default: false },
        { key: 'maxEmoteHeight', type: "int", default: 200 },
        { key: 'debug', type: "bool", default: false },
        { key: 'enableSlide', type: "bool", default: true },
        { key: 'enableSpin', type: "bool", default: true },
        { key: 'enableVibrate', type: "bool", default: true },
        { key: 'enableTranspose', type: "bool", default: true },
        { key: 'enableReverse', type: "bool", default: true },
        { key: 'enableRotate', type: "bool", default: true },
        { key: 'enableBrody', type: "bool", default: true },
        { key: 'enableInvert', type: "bool", default: true },
        { key: 'blacklist', type: "string_array", default: [] }
    ];

    Bem.loadSettings = function (settings, callback) {
        var total = settings.length;
        var cbCounter = function () {
            total--;
            if (total === 0) {
                callback();
            }
        };
        $.each(settings, function (i, item) {
            var cb = function (val) {
                switch (item.type) {
                    case "bool":
                        if (val === "false") val = false;
                        else if (val == "true") val = true;
                        else val = item.default;
                        break;
                    case "int":
                        if (val) val = +val;
                        else val = item.default;
                        break;
                    case "string_array":
                        if(!val) val = item.default;
                        else val = val.split(/[\s,]+/);
                        break;
                }
                Bem[item.key] = val;
                console.log("Setting: ", item.key, " to ", val);
                cbCounter();
            };
            Bem.settings.get(item.key, cb);
        });
    };


    Bem.effectStack = [];
    Bem.emoteRegex = /\[\]\(\/([\w:!#\/]+)([-\w!]*)([^)]*)\)/gi;
    Bem.searchPage = 0;

    Bem.spinAnimations = ['spin', 'zspin', 'xspin', 'yspin', '!spin', '!zspin', '!xspin', '!yspin'];
    Bem.animationSpeeds = ['slowest', 'slower', 'slow', 'fast', 'faster', 'fastest'];
    Bem.refreshers = ['marminator', 'toastdeib', 'miggyb', 'jerick'];
    Bem.animationSpeedMap = {
        'slowest': '14s',
        'slower': '12s',
        'slow': '10s',
        'fast': '6s',
        'faster': '4s',
        'fastest': '2s'
    };

    Bem.applyEmotesToStr = function (str) {
        var match;
        while (match = Bem.emoteRegex.exec(str)) {
            var emoteId = Bem.map[match[1]];
            if (emoteId !== undefined) {
                var emote = Bem.emotes[emoteId];
                if (Bem.isEmoteEligible(emote)) {
                    var emoteCode = Bem.getEmoteHtml(emote, match[2]);
                    //if (Bem.debug) console.log('Emote code: ' + emoteCode);
                    var replace_regex = new RegExp(['\\[\\]\\(\\/(', match[1], match[2], ')(', match[3] , ')\\)'].join(''), 'gi');
                    //if (Bem.debug) console.log('Replace regex: ', replace_regex);
                    str = str.replace(replace_regex, emoteCode + '$2');
                }
            }
        }
        return str;
    };

    Bem.applyEmotesToAnchor = function (a) {
        //try {
        var href = a.getAttribute('href').substring(1).split('-');
        var name = href.shift();
        var emoteId = Bem.map[name];
        if (emoteId) {
            var $a = $(a);
            var emote = Bem.emotes[emoteId];
            var emoteCode = Bem.getEmoteHtml(emote, href.join('-'));
            var emoteDom = $("<span>" + emoteCode + "</span>");
            $a.replaceWith(emoteDom);
            Bem.postEmoteEffects(emoteDom, false);
        }
        //} catch (ex) {
        //    console.log("Exception mucking with anchor: ", a, ex);
        //}
    };

    Bem.nodeTypeWhitelist = [
        'b',
        'big',
        'blockquote',
        'body',
        'br',
        'caption',
        'center',
        'cite',
        'code',
        'dir',
        'div',
        'em',
        'form',
        'h1', 'h2','h3','h4','h5','h6',
        'i',
        'label',
        'li',
        'p',
        'pre',
        'q',
        's',
        'small',
        'span',
        'strike',
        'strong',
        'style',
        'sub',
        'sup',
        'td',
        'tt',
        'u'
    ];

    Bem.applyEmotesToTextNode = function (textNode) {
        if (textNode.parentNode &&
            textNode.nodeValue &&
            textNode.nodeValue.search(Bem.emoteRegex) >= 0 &&
            textNode.parentNode.nodeName &&
            Bem.nodeTypeWhitelist.indexOf(textNode.parentNode.nodeName.toLowerCase()) >= 0) {
            textNode = $(textNode.parentNode);
            var emoteHtml = Bem.applyEmotesToStr(textNode.text());
            if (Bem.debug) console.log("emote html: ", emoteHtml);
            textNode.html(emoteHtml);
            Bem.postEmoteEffects(textNode);
        }
    };

    Bem.getEmoteHtml = function (emote, flags) {
        return ['<span class="berryemote',
            emote.height > Bem.maxEmoteHeight ? ' resize' : '',
            Bem.apngSupported == false && emote.apng_url ? ' canvasapng' : '',
            Bem.onlyHover == true ? ' berryemote_hover' : '',
            '" ',
            'style="',
            'height:', emote.height, 'px; ',
            'width:', emote.width, 'px; ',
            'display:inline-block; ',
            'position: relative; overflow: hidden;', '" ',
            'flags="', flags, '" ',
            'emote_id="', emote.id , '"></span>'
        ].join('');
    };

    Bem.isEmoteEligible = function (emote) {
        var eligible = true;
        for (var j = 0; j < Bem.blacklist.length; j++) {
            if (emote.names.indexOf($.trim(Bem.blacklist[j])) > -1) {
                eligible = false;
            }
        }
        if (Bem.showNsfwEmotes === false && emote.nsfw) eligible = false;
        return eligible;
    };

    Bem.applyAnimation = function (emote, $emote) {
        APNG.createAPNGCanvas(emote.apng_url, function (canvas) {
            var position = (emote['background-position'] || ['0px', '0px']);
            var $canvas = $(canvas);
            $emote.append(canvas);
            $canvas.css('position', 'absolute');
            $canvas.css('left', position[0]);
            $canvas.css('top', position[1]);
        });
    };

    Bem.wrapEmoteHeight = function ($emote, height) {
        var offset = Math.floor((height - $emote.height()) / 2);
        $emote.wrap('<span class="rotation-wrapper" />').parent().css({
            'height': Math.ceil(height - offset),
            'display': 'inline-block',
            'margin-top': offset,
            'position': 'relative'});
    };

    Bem.postEmoteEffects = function (message, isSearch, ttl, username) {
        if (!Bem.apngSupported) {
            var emotesToAnimate = message.find('.canvasapng');
            $.each(emotesToAnimate, function (i, emoteDom) {
                var $emote = $(emoteDom);
                var emote = Bem.emotes[$emote.attr('emote_id')];

                if (isSearch) {
                    $emote.hover(function () {
                        var $this = $(this);
                        $this.css('background-image', '');
                        Bem.applyAnimation(emote, $this);
                    });
                    $emote.append('Hover to animate');
                    $emote.css('border', '1px solid black');
                    $emote.css('background-image', ['url(', emote['background-image'], ')'].join(''));
                } else {
                    Bem.applyAnimation(emote, $emote);
                }
            });
        }

        var emotesToResize = message.find('.resize');
        $.each(emotesToResize, function (i, emoteDom) {
            var $emote = $(emoteDom);
            var scale = Bem.maxEmoteHeight / $emote.height();
            var innerWrap = $emote.wrap('<span class="berryemote-wrapper-outer"><span class="berryemote-wrapper-inner"></span></span>').parent();
            var outerWrap = innerWrap.parent();
            outerWrap.css('height', $emote.height() * scale);
            outerWrap.css('width', $emote.width() * scale);
            outerWrap.css('display', 'inline-block');
            outerWrap.css('position', 'relative');
            innerWrap.css('transform', ['scale(', scale, ', ', scale, ')'].join(''));
            innerWrap.css('-webkit-transform', ['scale(', scale, ', ', scale, ')'].join(''));
            innerWrap.css('transform-origin', 'left top');
            innerWrap.css('position', 'absolute');
            innerWrap.css('top', '0');
            innerWrap.css('left', '0');
        });

        if (Bem.onlyHover && !isSearch) {
            var emotesToHover = message.find('.berryemote_hover');
            $.each(emotesToHover, function (index, emoteDom) {
                var $emote = $(emoteDom);
                var emote = Bem.emotes[$emote.attr('emote_id')];
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
        if (!isSearch && Bem.effects) {
            $.each(emotes, function (index, emoteDom) {
                var $emote = $(emoteDom);
                var emote = Bem.emotes[$emote.attr('emote_id')];
                var flags = $emote.attr('flags').split('-');

                var grandParent = $emote.parents('.berryemote-wrapper-outer');
                $emote = grandParent.is('.berryemote-wrapper-outer') ? grandParent : $emote;
                var animations = [];
                var wrapperAnimations = [];
                var transforms = [];

                var speed;
                var reverse;
                var spin;
                var brody;
                var needsWrapper;
                for (var i = 0; i < flags.length; ++i) {
                    if (Bem.animationSpeeds.indexOf(flags[i]) > -1 || flags[i].match(/^s\d/)) {
                        speed = flags[i];
                    }
                    if (flags[i] == 'r') {
                        reverse = true;
                    }
                    if (Bem.spinAnimations.indexOf(flags[i]) != -1) {
                        spin = true;
                    }
                    if (flags[i] == 'brody') {
                        brody = true;
                    }
                    if ((Bem.enableSpin && (flags[i] == 'spin' || flags[i] == 'zspin')) ||
                        (Bem.enableRotate && flags[i].match(/^\d+$/)) ||
                        (Bem.enableBrody && flags[i] == 'brody')) {
                        needsWrapper = true;
                    }
                }
                for (var i = 0; i < flags.length; ++i) {
                    if (Bem.enableSpin && Bem.spinAnimations.indexOf(flags[i]) != -1) {
                        animations.push(flags[i] + ' 2s infinite linear');
                        if (flags[i] == 'zspin' || flags[i] == 'spin') {
                            var diag = Math.sqrt($emote.width() * $emote.width() + $emote.height() * $emote.height());
                            Bem.wrapEmoteHeight($emote, diag);
                        }
                    }
                    if (Bem.enableSlide && (flags[i] == 'slide' || flags[i] == '!slide')) {
                        slideAnimations = [];
                        var slideSpeed = '8s';
                        if (speed) {
                            if (speed.match(/^s\d/)) {
                                slideSpeed = speed.replace('s', '') + 's';
                            }
                            else {
                                slideSpeed = Bem.animationSpeedMap[speed];
                                if (!slideSpeed) slideSpeed = '8s';
                            }
                        }

                        slideAnimations.push(['slideleft', slideSpeed, 'infinite ease'].join(' '));
                        if (!brody && !spin) {
                            if (flags[i] == 'slide' && reverse) {
                                slideAnimations.push(['!slideflip', slideSpeed, 'infinite ease'].join(' '));
                            }
                            else {
                                slideAnimations.push(['slideflip', slideSpeed, 'infinite ease'].join(' '));
                            }
                        }
                        if (!needsWrapper) {
                            animations.push.apply(animations, slideAnimations);
                        }
                        else {
                            wrapperAnimations.push.apply(wrapperAnimations, slideAnimations);
                        }
                    }
                    if (Bem.enableRotate && flags[i].match(/^\d+$/)) {
                        transforms.push('rotate(' + flags[i] + 'deg)');
                        var rot_height = $emote.width() * Math.abs(Math.sin(flags[i] * Math.PI / 180)) + $emote.height() * Math.abs(Math.cos(flags[i] * Math.PI / 180));
                        Bem.wrapEmoteHeight($emote, rot_height);
                    }
                    if (Bem.enableTranspose && flags[i].match(/^x\d+$/)) {
                        var shift = +flags[i].replace('x', '');
                        shift = shift > 150 ? 0 : shift;
                        $emote.css('left', shift + 'px');
                    }
                    if (Bem.enableTranspose && flags[i].match(/^!x\d+$/)) {
                        var shift = +flags[i].replace('!x', '');
                        shift = shift * -1;
                        shift = shift < -150 ? 0 : shift;
                        $emote.css('left', shift + 'px');
                    }
                    if (Bem.enableTranspose && flags[i].match(/^z\d+$/)) {
                        var zindex = +flags[i].replace('z', '');
                        zindex = zindex > 10 ? 0 : zindex;
                        $emote.css('z-index', zindex);
                    }
                    if (Bem.enableVibrate && (flags[i] == 'vibrate' || flags[i] == 'chargin' || flags[i] == 'v')) {
                        animations.unshift('vibrate 0.05s infinite linear');
                    }
                    if (Bem.enableInvert && flags[i] == 'invert') {
                        $emote.addClass('bem-invert');
                    }
                    else if (Bem.enableInvert && flags[i] == 'i') {
                        $emote.addClass('bem-hue-rotate');
                    }
                    if (Bem.enableBrody && (flags[i] == 'brody')) {
                        animations.push('brody  1.27659s infinite ease');
                        var brody_height = 1.01 * ($emote.width() * Math.sin(10 * Math.PI / 180) + $emote.height() * Math.cos(10 * Math.PI / 180));
                        Bem.wrapEmoteHeight($emote, brody_height);
                    }
                }
                if (animations.length > 0 && ttl) {
                    Bem.effectStack.push({"ttl": ttl, "$emote": $emote});
                }

                $emote.css('animation', animations.join(',').replace('!', '-'));
                if (needsWrapper) {
                    $emote.parent().css('animation', wrapperAnimations.join(',').replace('!', '-'));
                }
                if (Bem.enableReverse && reverse) transforms.push('scaleX(-1)');
                if (transforms.length > 0) {
                    $emote.css('transform', transforms.join(' '));
                }
            });
        }
        $.each(emotes, function (index, emoteDom) {
            //if (Bem.debug) console.log('Adding bgimage to ', emoteDom);
            var $emote = $(emoteDom);
            var emote = Bem.emotes[$emote.attr('emote_id')];
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
            username = username || "";
            if (Bem.refreshers.indexOf(username.toLowerCase()) > -1) {
                var flags = $emote.attr('flags').split('-');
                if (flags.indexOf('refresh') >= 0) {
                    var sleep = Math.random() * 30;
                    sleep = (sleep + 1) * 1000;
                    if (Bem.debug) console.log('Got refresh, going in: ', sleep);
                    setTimeout(berryEmoteDataRefresh, sleep);
                }
            }
            $emote.removeAttr('flags');
        });
    };

    Bem.buildEmoteMap = function () {
        Bem.map = {};
        var max = Bem.emotes.length;
        for (var i = 0; i < max; ++i) {
            var berryemote = Bem.emotes[i];
            for (var j = 0; j < berryemote.names.length; ++j) {
                Bem.map[berryemote.names[j]] = i;
                berryemote.id = i;
            }
            if (!berryemote.tags) berryemote.tags = [];
            if (berryemote.apng_url) {
                berryemote.tags.push('animated');
            }
            if (berryemote.nsfw) {
                berryemote.tags.push('nsfw');
            }
        }
    };
    Bem.whenExists = function (objSelector, callback) {
        var guy = $(objSelector);
        if (guy.length <= 0) {
            setTimeout(function () {
                Bem.whenExists(objSelector, callback)
            }, 100);
        } else {
            callback(guy);
        }
    };

    Bem.injectEmoteButton = function (target) {
        Bem.whenExists(target, function () {
            if (Bem.debug) console.log('Injecting settings button.');
            var settingsMenu = $('<div/>').addClass('settings').appendTo($(target)).text("Emotes");
            settingsMenu.css('margin-right', '2px');
            settingsMenu.css('background', 'url(http://backstage.berrytube.tv/marminator/bp.png) no-repeat scroll left center transparent');
            settingsMenu.click(function () {
                Bem.showBerrymoteSearch();
            });

            if (Bem.debug) console.log('Settings button injected: ', settingsMenu);
        });
    };

    Bem.listenForKeyboard = function () {
        $(window).keydown(function (event) {
            if ((event.keyCode == 69 && event.ctrlKey) ||
                (Bem.drunkMode && event.ctrlKey && (event.keyCode == 87 || event.keyCode == 82)) ||
                (event.keyCode == 27 && $('.berrymotes_search_results').length)) {
                if ($('.berrymotes_search_results').length) {
                    $('.dialogWindow').remove();
                }
                else {
                    Bem.showBerrymoteSearch();
                }
                event.preventDefault();
                return false;
            }
            return true;
        });

        $('body').on('focus', ':text,textarea', function () {
            if ($(this).is(".berrymotes_search")) return;
            Bem.lastFocus = this;
            if (Bem.debug) console.log('Setting focus to: ', this);
        });
    };

    Bem.waitToStart = function () {
        if (typeof Bem.emotes === "undefined" ||
            Bem.apngSupported === undefined ||
            Bem.berrySiteInit === undefined ||
            (Bem.apngSupported ? false : typeof APNG === "undefined")) {
            setTimeout(Bem.waitToStart, 100);
            if (Bem.debug) console.log('waiting ');
        }
        else {
            Bem.loadSettings(settings_schema, function () {
                if (Bem.debug) console.log('starting');
                if (Bem.debug) {
                    $("head").append('<link rel="stylesheet" type="text/css" ' +
                        'href="http://backstage.berrytube.tv/marminator/berryemotecore.staging.css" />');
                }
                else {
                    $("head").append('<link rel="stylesheet" type="text/css" ' +
                        'href="http://backstage.berrytube.tv/marminator/berryemotecore.css" />');
                }
                Bem.berrySiteInit();
                Bem.listenForKeyboard();
            });
        }
    };

    Bem.insertAtCursor = function (myField, myValue) {
        //IE support
        if (document.selection) {
            myField.focus();
            sel = document.selection.createRange();
            sel.text = myValue;
            var cursor = myField.selectionStart + myValue.length;
            myField.setSelectionRange(cursor, cursor);
        }
        //MOZILLA and others
        else if (myField.selectionStart || myField.selectionStart == '0') {
            var startPos = myField.selectionStart;
            var endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos)
                + myValue
                + myField.value.substring(endPos, myField.value.length);
            var cursor = myField.selectionStart + myValue.length;
            myField.selectionStart = myField.selectionEnd = cursor;
        } else {
            myField.value += myValue;
        }
    };

    Bem.showBerrymoteSearch = function () {
        var searchWin = $("body").dialogWindow({
            title: "BerryEmote Search",
            uid: "berryEmoteSearch",
            center: true
        });
        if (Bem.debug) console.log('Search window: ', searchWin);
        var settingsMenu = $('<div style="float: right; cursor: pointer; text-decoration: underline;" />')
            .appendTo(searchWin)
            .text("Settings");
        settingsMenu.click(function () {
            Bem.showBerrymoteConfig();
        });

        var searchTimer;
        var pageSize = 50;
        var page = 0;
        var searchResults = [];
        var distances;
        var $searchBox = $('<input class="berrymotes_search" type="text" placeholder="Search..." />').appendTo(searchWin);
        if (Bem.berryEmoteSearchTerm) {
            $searchBox.val(Bem.berryEmoteSearchTerm);
        }
        $searchBox.focus();
        $searchBox.select();

        var $results = $('<div class="berrymotes_search_results" style="width:500px; height: 500px; overflow-y: scroll;" ></div>').appendTo(searchWin);
        $results.on('click', '.berryemote', function (e) {
            var insertMode = false;
            if (Bem.lastFocus) {
                var $emote = $(e.currentTarget);
                var emote = Bem.emotes[$emote.attr('emote_id')];
                Bem.insertAtCursor(Bem.lastFocus, ['[](/', emote.names[0], ')'].join(''));
                searchWin.parent('.dialogWindow').remove();
                Bem.lastFocus.focus();
            }
        });

        searchWin.on('click', '.next_page, .prev_page', function (e) {
            $results.scrollTop(0);
            var $button = $(e.currentTarget);
            if ($button.is('.next_page')) {
                if ((page === 0 && searchResults.length > pageSize) ||
                    (page > 0 && Math.floor((searchResults.length - (page * pageSize)) / pageSize) > 0)) {
                    page++;
                    Bem.searchPage = page;
                }
            }
            else if (page > 0) {
                page--;
                Bem.searchPage = page;
            }
            showSearchResults();
        });

        var showSearchResults = function () {
            var max = Math.min(pageSize, searchResults.length);
            $results.empty();
            var start = page * pageSize;
            var max = Math.min(start + pageSize, searchResults.length);
            for (var i = start; i < max; ++i) {
                var emote = $('<span style="margin: 2px;" />').append(Bem.getEmoteHtml(Bem.emotes[searchResults[i]]));
                Bem.postEmoteEffects(emote, true);
                $results.append(emote);
            }
            $('.num_found').text('Found: ' + searchResults.length);
        };

        var berryEmoteSearch = function (startPage) {
            searchResults = [];
            distances = [];
            var term = $searchBox.val();
            Bem.berryEmoteSearchTerm = term;

            if (!term) {
                var max = Bem.emotes.length;
                for (var i = 0; i < max; ++i) {
                    var emote = Bem.emotes[i];
                    if (Bem.isEmoteEligible(emote)) {
                        searchResults.push(i);
                    }
                }
            }
            else {
                var searchBits = term.split(' ');
                var tags = [];
                var srs = [];
                var terms = [];
                var scores = {};
                var srRegex = /^[-+]?sr:/i;
                var tagRegex = /^[-+]/i;

                function sdrify(str) {
                    return new RegExp('^' + str, 'i');
                }

                for (var i = 0; i < searchBits.length; ++i) {
                    var bit = $.trim(searchBits[i]);
                    if (bit.match(srRegex)) {
                        if (bit[0] == '-' || bit[0] == '+') {
                            srs.push({match: bit[0] == '-' ? false : true, sdr: sdrify(bit.substring(4))});
                        } else {
                            srs.push({match: true, sdr: sdrify(bit.substring(3))});
                        }
                    } else if (bit.match(tagRegex)) {
                        tags.push({match: bit[0] == '-' ? false : true, sdr: sdrify(bit.substring(1))});
                    } else {
                        terms.push({
                            any: new RegExp(bit, 'i'),
                            prefix: sdrify(bit),
                            exact: new RegExp('^' + bit + '$')
                        });
                    }
                }

                var max = Bem.emotes.length;
                for (var i = 0; i < max; ++i) {
                    var emote = Bem.emotes[i];
                    if (!Bem.isEmoteEligible(emote)) continue;
                    var negated = false;
                    for (var k = 0; k < srs.length; ++k) {
                        var match = emote.sr.match(srs[k].sdr) || [];
                        if (match.length != srs[k].match) {
                            negated = true;
                        }
                    }
                    if (negated) continue;
                    if (tags.length && (!emote.tags || !emote.tags.length)) continue;
                    if (emote.tags && tags.length) {
                        for (var j = 0; j < tags.length; ++j) {
                            var tagSearch = tags[j];
                            var match = false;
                            for (var k = 0; k < emote.tags.length; ++k) {
                                var tag = emote.tags[k];
                                var tagMatch = tag.match(tagSearch.sdr) || [];
                                if (tagMatch.length) {
                                    match = true;
                                }
                            }
                            if (match != tagSearch.match) {
                                negated = true;
                                break;
                            }
                        }
                    }
                    if (negated) continue;
                    if (terms.length) {
                        for (var j = 0; j < terms.length; ++j) {
                            var term = terms[j];
                            var match = false;
                            for (var k = 0; k < emote.names.length; ++k) {
                                var name = emote.names[k];
                                if (name.match(term.exact)) {
                                    scores[i] = (scores[i] || 0.0) + 3;
                                    match = true;
                                } else if (name.match(term.prefix)) {
                                    scores[i] = (scores[i] || 0.0) + 2;
                                    match = true;
                                } else if (name.match(term.any)) {
                                    scores[i] = (scores[i] || 0.0) + 1;
                                    match = true;
                                }
                            }
                            for (var k = 0; k < emote.tags.length; k++) {
                                var tag = emote.tags[k];
                                if (tag.match(term.exact)) {
                                    scores[i] = (scores[i] || 0.0) + 0.3;
                                    match = true;
                                } else if (tag.match(term.prefix)) {
                                    scores[i] = (scores[i] || 0.0) + 0.2;
                                    match = true;
                                } else if (tag.match(term.any)) {
                                    scores[i] = (scores[i] || 0.0) + 0.1;
                                    match = true;
                                }
                            }
                            if (!match) {
                                delete scores[i];
                                negated = true;
                                break;
                            }
                        }
                        if (negated) continue;
                        //if (Bem.debug) console.log('Matched emote, score: ', emote, scores[i]);
                    } else {
                        scores[i] = 0;
                    }
                }
                for (var id in scores) {
                    searchResults.push(id);
                }
                searchResults.sort(function (a, b) {
                    return scores[b] - scores[a];
                });
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
                }, 400);
            }
        });

        berryEmoteSearch(Bem.searchPage);

        $('<span class="prev_page" style="cursor: pointer; text-decoration: underline;" />')
            .appendTo(searchWin)
            .text("< Prev");
        $('<span class="next_page" style="cursor: pointer; text-decoration: underline; margin-left:5px;" />')
            .appendTo(searchWin)
            .text("Next >");

        searchWin.window.center();
    };

    Bem.emoteRefresh = function () {
        $.getJSON('http://backstage.berrytube.tv/marminator/berrymotes_json_data.json', function (data) {
            Bem.emotes = data;
            Bem.buildEmoteMap();
        });
    };

    Bem.showBerrymoteConfig = function () {
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
        if (Bem.enabled) displayEmotes.attr('checked', 'checked');
        displayEmotes.change(function () {
            var enabled = $(this).is(":checked");
            Bem.enabled = enabled;
            Bem.settings.set('enabled', enabled);
        });
//----------------------------------------
        row = $('<div/>').appendTo(configOps);
        $('<span/>').text("NSFW Emotes: ").appendTo(row);
        var nsfwEmotes = $('<input/>').attr('type', 'checkbox').appendTo(row);
        if (Bem.showNsfwEmotes) nsfwEmotes.attr('checked', 'checked');
        nsfwEmotes.change(function () {
            var enabled = $(this).is(":checked");
            Bem.showNsfwEmotes = enabled;
            Bem.settings.set('showNsfwEmotes', enabled);
        });
//----------------------------------------
        row = $('<div/>').appendTo(configOps);
        $('<span/>').text("Only show emotes on hover: ").appendTo(row);
        var cadesBeardMode = $('<input/>').attr('type', 'checkbox').appendTo(row);
        if (Bem.onlyHover) cadesBeardMode.attr('checked', 'checked');
        cadesBeardMode.change(function () {
            var enabled = $(this).is(":checked");
            Bem.onlyHover = enabled;
            Bem.settings.set('onlyHover', enabled);
        });
//----------------------------------------
        row = $('<div/>').appendTo(configOps);
        $('<span/>').text("Enable extra effects: ").appendTo(row);
        var effects = $('<input/>').attr('type', 'checkbox').appendTo(row);
        if (Bem.effects) effects.attr('checked', 'checked');
        effects.change(function () {
            var enabled = $(this).is(":checked");
            Bem.effects = enabled;
            Bem.settings.set('effects', enabled);
        });
        effects = $('<div style="margin-left:10px; border: 1px solid black;"><div style="clear:both;"/></div>');
        configOps.append(effects);
//----------------------------------------
        Bem.berryCreateOption(effects, "Slide Effect", "enableSlide");
        Bem.berryCreateOption(effects, "Spin Effect", "enableSpin");
        Bem.berryCreateOption(effects, "Vibrate Effect", "enableVibrate");
        Bem.berryCreateOption(effects, "Transpose (shift left and right) Effect", "enableTranspose");
        Bem.berryCreateOption(effects, "Reverse Effect", "enableReverse");
        Bem.berryCreateOption(effects, "Rotate Effect", "enableRotate");
        Bem.berryCreateOption(effects, "Brody Effect", "enableBrody");
        Bem.berryCreateOption(effects, "Invert Effect", "enableInvert");
//----------------------------------------
        row = $('<div/>').appendTo(configOps);
        $('<span/>').text("Max Height:").appendTo(row);
        var maxHeight = $('<input/>').attr('type', 'text').val(Bem.maxEmoteHeight).addClass("small").appendTo(row);
        maxHeight.css('text-align', 'center');
        maxHeight.css('width', '30px');
        maxHeight.keyup(function () {
            Bem.maxEmoteHeight = maxHeight.val();
            Bem.settings.set('maxEmoteHeight', maxHeight.val());
        });
        $('<span/>').text("pixels.").appendTo(row);
//----------------------------------------
        row = $('<div/>').appendTo(configOps);
        $('<span/>').text("Blacklist (emote names, comma separated)").appendTo(row);
        var emoteBlacklist = $('<textarea/>').val(Bem.blacklist).appendTo(row);
        emoteBlacklist.css('text-align', 'center');
        emoteBlacklist.css('width', '300px');
        emoteBlacklist.keyup(function () {
            Bem.blacklist = emoteBlacklist.val().split(',');
            Bem.settings.set('blacklist', emoteBlacklist.val());
        });
//----------------------------------------
        if (typeof siteSettings !== "undefined") {
            siteSettings(configOps);
        }
        settWin.window.center();
    };

    Bem.berryCreateOption = function (configOps, title, optionName) {
        //----------------------------------------
        row = $('<div/>').appendTo(configOps);
        $('<span/>').text(title).appendTo(row);
        var chkBox = $('<input/>').attr('type', 'checkbox').appendTo(row);
        if (this[optionName]) chkBox.attr('checked', 'checked');
        chkBox.change(function () {
            var enabled = $(this).is(":checked");
            eval(optionName + " = " + enabled);
            Bem.settings.set(optionName, enabled);
        });
    };

    function walk(node) {
        // I stole this function from here:
        // http://is.gd/mwZp7E

        var child, next;

        switch (node.nodeType) {
            case 1:  // Element
            case 9:  // Document
            case 11: // Document fragment
                child = node.firstChild;
                while (child) {
                    next = child.nextSibling;
                    walk(child);
                    child = next;
                }
                break;

            case 3: // Text node
                Bem.applyEmotesToTextNode(node);
                break;
        }
    }

    Bem.apngSupported = typeof APNG === "undefined";
    Bem.emoteRefresh();
    Bem.waitToStart();
})(Bem.jQuery);
