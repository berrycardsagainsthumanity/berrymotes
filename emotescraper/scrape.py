# --------------------------------------------------------------------
#
# Copyright (C) 2013 Marminator <cody_y@shaw.ca>
# Copyright (C) 2013 pao <patrick.oleary@gmail.com>
# Copyright (C) 2013 Daniel Triendl <daniel@pew.cc>
#
# This program is free software. It comes without any warranty, to
# the extent permitted by applicable law. You can redistribute it
# and/or modify it under the terms of the Do What The Fuck You Want
# To Public License, Version 2, as published by Sam Hocevar. See
# COPYING for more details.
#
# --------------------------------------------------------------------

import logging
logger = logging.basicConfig(level=logging.WARN)

from bmscraper import BMScraper, UserscriptEmotesProcessorFactory, RateLimiter
from data import *
from json import dumps, loads
import os



factory = UserscriptEmotesProcessorFactory(single_emotes_filename='..' + os.path.sep + 'single_emotes' + os.path.sep + '%s' + os.path.sep + '%s.png',
                                           apng_dir='..' + os.path.sep + 'images',
                                           apng_url='http://backstage.berrytube.tv/marminator/images/%s/%s')

if os.path.exists('color_data.txt'):
    f = open('color_data.txt', 'rb')
    factory.color_data = loads(f.read())
    f.close()
  

scraper = BMScraper(factory)
scraper.user = 'ponymoteharvester'
scraper.password = 'berry_punch'
scraper.subreddits = subreddits
scraper.image_blacklist = image_blacklist
scraper.nsfw_subreddits = nsfw_subreddits
scraper.emote_info = emote_info
scraper.rate_limit_lock = RateLimiter(max_messages=30, every_seconds=60)

if os.path.exists('data.js'):
    f = open('data.js', 'rb')
    scraper.tags_data = loads(f.read())
    f.close()

scraper.scrape()

f = open('..' + os.path.sep + 'js' + os.path.sep + 'berrymotes_data.js', 'wb')
f.write(''.join(["var berryEmotes=", dumps(scraper.emotes, separators=(',', ':')), ";"]))
f.close()

f = open('color_data.txt', 'wb')
f.write(dumps(factory.color_data))
f.close()

color_data_js = {}
for data in factory.color_data.values():
    color_data_js.update(data)
f = open('..' + os.path.sep + 'js' + os.path.sep + 'berrymotes_colour_data.js', 'wb')
f.write(''.join(["var berryEmotesColours=", dumps(color_data_js, separators=(',', ':')), ";"]))
f.close()
