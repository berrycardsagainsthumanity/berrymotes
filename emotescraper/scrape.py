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
import time
import requests
from bmscraper.ratelimiter import TokenBucket

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
from bmscraper import BMScraper, UserscriptEmotesProcessorFactory

from data import *
import json
import os


factory = UserscriptEmotesProcessorFactory(single_emotes_filename=os.path.join('..', 'single_emotes', '{}', '{}.png'),
                                           apng_dir=os.path.join('..', 'images'),
                                           apng_url='http://berrymotes.com/images/{}/{}')

scraper = BMScraper(factory)
scraper.user = 'ponymoteharvester'
scraper.password = 'berry_punch'
scraper.subreddits = subreddits
scraper.image_blacklist = image_blacklist
scraper.nsfw_subreddits = nsfw_subreddits
scraper.emote_info = emote_info
scraper.rate_limit_lock = TokenBucket(15, 30)
scraper.tags_data = requests.get("http://btc.berrytube.tv/berrymotes/data.js").json()

start = time.time()
scraper.scrape()
logger.info("Finished scrape in {}.".format(time.time() - start))

with open(os.path.join('..', 'js', 'berrymotes_data.min.js'), 'w') as f:
    f.write("var berryEmotes = ")
    json.dump(scraper.emotes, fp=f, separators=(',', ':') )
    f.write(";")

with open(os.path.join('..', 'js', 'berrymotes_data.js'), 'w') as f:
    f.write("var berryEmotes = ")
    json.dump(scraper.emotes, fp=f, separators=(',', ':'), indent=2 )
    f.write(";")

with open(os.path.join('..', 'js', 'berrymotes_data.min.json'), 'w') as f:
    json.dump(scraper.emotes, fp=f, separators=(',', ':') )

with open(os.path.join('..', 'js', 'berrymotes_data.json'), 'w') as f:
    json.dump(scraper.emotes, fp=f, separators=(',', ':'), indent=2 )

