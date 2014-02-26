(function ($) {
    Bem.emoteRefresh = function (cache) {
        cache = cache || true;
        $.ajax({
            cache: cache,
            url: '//berrymotes.com/assets/berrymotes_json_data.json',
            dataType: 'json',
            success: function (data) {
                Bem.emotes = data;
                Bem.buildEmoteMap();
            }
        });
    };
})(Bem.jQuery);