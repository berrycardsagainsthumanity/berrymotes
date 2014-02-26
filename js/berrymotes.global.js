/*
 * Copyright (C) 2013 Marminator <cody_y@shaw.ca>
 *
 * This program is free software. It comes without any warranty, to
 * the extent permitted by applicable law. You can redistribute it
 * and/or modify it under the terms of the Do What The Fuck You Want
 * To Public License, Version 2, as published by Sam Hocevar. See
 * COPYING for more details.
 */

Bem = typeof Bem === "undefined" ? {} : Bem;
Bem.jQuery = jQuery.noConflict(true);

var berrytube_settings_schema = [
    { key: 'enableSiteBlacklist', type: "bool", default: false },
    { key: 'enableSiteWhitelist', type: "bool", default: true },
    { key: 'siteWhitelist', type: "string_array", default: ['www.reddit.com'] },
    { key: 'siteBlacklist', type: "string_array", default: [] }
];

Bem.berrySiteInit = function () {
    Bem.loadSettings(berrytube_settings_schema, function () {

    });

    (function ($) {
        var mutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver;

        var mutationHandler = function (mutations) {
            for (var i = 0; i < mutations.length; ++i) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                    var addedNodes = $(mutations[i].addedNodes);

                    if (location.hostname == 'www.reddit.com') {
                        var emotes = addedNodes.find('a[href^="/"]:not([id])');
                        emotes.each(function (i, emote) {
                            Bem.applyEmotesToAnchor(this);
                        });
                        var buttonPanes = addedNodes.find('.commentarea .bottom-area .usertext-buttons');
                        for (var j = 0; j < buttonPanes.length; ++j) {
                            Bem.injectEmoteButton(buttonPanes[j]);
                        }
                    } else {
                        for (var j = 0; j < addedNodes.length; ++j) {
                            var node = addedNodes[j];
                            walk(node);
                        }
                    }

                } else if (mutations[i].type === "characterData") {
                    Bem.applyEmotesToTextNode(mutations[i].target);
                }
            }
        };
        var observer = new mutationObserver(mutationHandler);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        function handleText(node) {
            Bem.applyEmotesToTextNode(node);
        }

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
                    handleText(node);
                    break;
            }
        }

        if (location.hostname == 'www.reddit.com') {
            $('a[href^="/"]:not([id])').each(function () {
                $(this).prev('.keyNavAnnotation').remove();
                Bem.applyEmotesToAnchor(this);
            });
            var buttonPanes = $('.commentarea .bottom-area .usertext-buttons');
            for (var j = 0; j < buttonPanes.length; ++j) {
                Bem.injectEmoteButton(buttonPanes[j]);
            }
        } else {
            walk(document.body);
        }
    })(Bem.jQuery);
};

Bem.settings = {
    get: function (key, callback) {
        var cb = function (data) {
            callback(data.value);
        };
        return BabelExt.storage.get(key, cb);
    },
    set: function (key, val, callback) {
        if (!callback) callback = function () {
        };
        BabelExt.storage.set(key, "" + val, callback);
    }
};

Bem.siteSettings = function (configOps) {
    var row = $(rowDivStr).appendTo(configOps);
    $(rowSpanStr).text("Site Blacklist (Display on everything except:) ").appendTo(row);
    var enableSiteBlacklist = $('<input/>').attr('type', 'radio').attr('name', 'BemSiteList').appendTo(row);
    var siteBlacklist = $('<textarea/>').val(Bem.siteBlacklist).appendTo(row);
    if (Bem.enableSiteBlacklist) {
        enableSiteBlacklist.attr('checked', 'checked');
    } else {
        siteBlacklist.attr('disabled', 'true');
    }
    enableSiteBlacklist.change(function () {
        var enabled = $(this).is(":checked");
        Bem.enableSiteBlacklist = enabled;
        Bem.enableSiteWhitelist = !enabled;
        Bem.settings.set('enableSiteBlacklist', enabled);
        Bem.settings.set('enableSiteWhitelist', !enabled);
        siteBlacklist.attr('disabled', !enabled);
        siteWhitelist.attr('disabled', enabled);
    });
    siteBlacklist.css('width', '300px');
    siteBlacklist.css('height', '100px');
    siteBlacklist.css('display', 'block');
    siteBlacklist.css('margin-left', '10px');
    siteBlacklist.keyup(function () {
        Bem.siteBlacklist = siteBlacklist.val().split(',');
        Bem.settings.set('siteBlacklist', siteBlacklist.val());
    });
    //----------------------------------------
    row = $(rowDivStr).appendTo(configOps);
    $(rowSpanStr).text("Site Whitelist (Only display on:) ").appendTo(row);
    var enableSiteWhitelist = $('<input/>').attr('type', 'radio').attr('name', 'BemSiteList').appendTo(row);
    var siteWhitelist = $('<textarea/>').val(Bem.siteWhitelist).appendTo(row);
    if (Bem.enableSiteWhitelist) {
        enableSiteWhitelist.attr('checked', 'checked');
    } else {
        siteWhitelist.attr('disabled', 'true');
    }
    enableSiteWhitelist.change(function () {
        var enabled = $(this).is(":checked");
        Bem.enableSiteWhitelist = enabled;
        Bem.enableSiteBlacklist = !enabled;
        Bem.settings.set('enableSiteWhitelist', enabled);
        Bem.settings.set('enableSiteBlacklist', !enabled);
        siteWhitelist.attr('disabled', !enabled);
        siteBlacklist.attr('disabled', enabled);
    });
    siteWhitelist.css('width', '300px');
    siteWhitelist.css('height', '100px');
    siteWhitelist.css('display', 'block');
    siteWhitelist.css('margin-left', '10px');
    siteWhitelist.keyup(function () {
        Bem.siteWhitelist = siteWhitelist.val().split(',');
        Bem.settings.set('siteWhitelist', siteWhitelist.val());
    });
    //----------------------------------------
};

(function ($) {
    $.fn.dialogWindow = function (data) {
        var parent = $('body');
        var myData = {
            title: "New Window",
            uid: false,
            offset: {
                top: 0,
                left: 0
            },
            onClose: false,
            center: false,
            toolBox: false,
            initialLoading: false
        };
        for (var i in data) {
            myData[i] = data[i];
        }

        //Tweak data
        myData.title = myData.title.replace(/ /g, '&nbsp;');

        //get handle to window list.
        var windows = $(parent).data('windows');
        if (typeof windows == "undefined") {
            $(parent).data('windows', []);
            windows = $(parent).data('windows');
        }

        // Remove old window if new uid matches an old one.
        if (myData.uid != false) {
            $(windows).each(function (key, val) {
                if ($(val).data('uid') == myData.uid) {
                    val.close();
                }
            });
        }

        // Create Window
        var newWindow = $('<div/>').appendTo(parent);
        newWindow.addClass("dialogWindow");
        newWindow.data('uid', myData.uid);
        newWindow.css('z-index', '999');
        newWindow.close = function () {
            var windows = $(parent).data('windows');
            windows.splice(windows.indexOf(this), 1);
            $(this).fadeOut('fast', function () {
                $(this).remove();
            });
            if (myData.onClose)myData.onClose();
        };
        newWindow.setLoaded = function () {
            $(newWindow).find(".loading").remove();
        };
        newWindow.winFocus = function () {
            var highestWindow = false;
            var highestWindowZ = 0;
            var windows = $(parent).data('windows');
            for (var i in windows) {
                if ($(windows[i]) == $(this)) continue;
                var hisZ = $(windows[i]).css('z-index');
                if (hisZ > highestWindowZ) {
                    highestWindow = $(windows[i]);
                    highestWindowZ = parseInt(hisZ);
                }
            }
            if ($(highestWindow) !== $(this)) {
                var newval = (highestWindowZ + 1);
                $(this).css('z-index', newval);
            }
        };
        newWindow.mousedown(function () {
            newWindow.winFocus()
        });

        windows.push(newWindow);

        if (myData.toolBox) {
            $(document).bind("mouseup.rmWindows", function (e) {
                var container = newWindow;
                if (container.has(e.target).length === 0) {
                    container.close();
                    $(document).unbind("mouseup.rmWindows");
                }
            });
        }

        if (!myData.toolBox) {
            // Toolbar
            var toolBar = $('<div/>').addClass("dialogToolbar").prependTo(newWindow);
            newWindow.draggable({
                handle: toolBar,
                start: function () {
                },
                stop: function () {
                }
            });

            // Title
            var titleBar = $('<div/>').addClass("dialogTitlebar").appendTo(toolBar).html(myData.title);

            // Close Button
            var closeBtn = $('<div/>').addClass("close").appendTo(toolBar);
            closeBtn.click(function () {
                newWindow.close();
            });

            //break
            $('<div/>').css("clear", 'both').appendTo(toolBar);
        }

        var contentArea = $('<div/>').appendTo(newWindow).addClass("dialogContent");
        contentArea.window = newWindow;

        // Position window
        if (myData.center) {
            newWindow.center();
        } else {
            newWindow.offset(myData.offset);
        }

        // Handle block for loading.
        if (data.initialLoading) {
            var block = $('<div/>').addClass("loading").prependTo(newWindow);
        }
        newWindow.winFocus();
        newWindow.fadeIn('fast');

        return contentArea;
    };
    $.fn.center = function () {
        this.css("position", "absolute");
        this.css("top", Math.max(0, (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop()) + "px");
        this.css("left", Math.max(0, (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft()) + "px");
        return this;
    };
})(Bem.jQuery);
