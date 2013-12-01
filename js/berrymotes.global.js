Bem = typeof Bem === "undefined" ? {} : Bem;
Bem.jQuery = jQuery.noConflict(true);

Bem.berrySiteInit = function () {
    (function ($) {
        var mutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver;

        var mutationHandler = function (mutations) {
            for (var i = 0; i < mutations.length; ++i) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                    var addedNodes = $(mutations[i].addedNodes);

                    if (location.hostname == 'www.reddit.com') {
                        var emotes = addedNodes.find('a[href^="/"]:empty:not([id])');
                        emotes.each(function (i, emote) {
                            Bem.applyEmotesToAnchor(this);
                        });
                        var buttonPanes = addedNodes.find('.commentarea .bottom-area .usertext-buttons');
                        for(var j = 0; j < buttonPanes.length; ++j){
                            Bem.injectEmoteButton(buttonPanes[j]);
                        }
                    }

                    for (var j = 0; j < addedNodes.length; ++j) {
                        var node = addedNodes[j];
                        walk(node);
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

        if (location.hostname == 'www.reddit.com') {
            $('a[href^="/"]:empty:not([id])').each(function () {
                $(this).prev('.keyNavAnnotation').remove();
                Bem.applyEmotesToAnchor(this);
            });
            var buttonPanes = $('.commentarea .bottom-area .usertext-buttons');
            for(var j = 0; j < buttonPanes.length; ++j){
                Bem.injectEmoteButton(buttonPanes[j]);
            }
        }

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

        walk(document.body);
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
