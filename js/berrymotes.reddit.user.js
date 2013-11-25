// ==UserScript==
// @id             www.reddit.com-07b507ad-e894-45a7-8313-8f9de9d833c3@scriptish
// @name           Berrymotes-reddit
// @version        1.0
// @namespace
// @author
// @description
// @include        http://www.reddit.com/
// @include        http://reddit.com/
// @include        http://www.reddit.com/*
// @include        http://reddit.com/*
// @include        *
// @run-at         document-end
// ==/UserScript==

(function() {
    var jquerys = document.createElement("script");
    jquerys.setAttribute("src", "//ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js");
    var jqueryuis = document.createElement('script');
    jqueryuis.src = '//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js';
    var startScript = document.createElement('script');
    startScript.src = 'http://backstage.berrytube.tv/marminator/berrymotes.reddit.js';
    var berrymoteData = document.createElement('script');
    berrymoteData.src = 'http://backstage.berrytube.tv/marminator/berrymotes_data.staging.js';
    var berrymoteCore = document.createElement('script');
    berrymoteCore.src = 'http://backstage.berrytube.tv/marminator/berrymotes.core.js';

    document.body.appendChild(jquerys);
    document.body.appendChild(jqueryuis);
    document.body.appendChild(startScript);
    document.body.appendChild(berrymoteData);
    document.body.appendChild(berrymoteCore);
})();