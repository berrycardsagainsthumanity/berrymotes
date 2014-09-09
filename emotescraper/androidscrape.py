# --------------------------------------------------------------------
#
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

from bmscraper import BMScraper, AndroidEmotesProcessorFactory
from bmscraper.ratelimiter import TokenBucket
from data import *
from json import dumps
import os
import gzip

factory = AndroidEmotesProcessorFactory(single_emotes_filename=os.path.join( '..', 'single_emotes', '{}', '{}.png'))
scraper = BMScraper(factory)
scraper.user = 'ponymoteharvester'
scraper.password = 'berry_punch'
scraper.subreddits = subreddits
scraper.image_blacklist = image_blacklist_android
scraper.nsfw_subreddits = nsfw_subreddits
scraper.emote_info = emote_info
scraper.rate_limit_lock = TokenBucket(15, 30)

scraper.scrape()

f = gzip.open(os.path.join('..', 'single_emotes', 'emotes.json.gz'), 'wb')
f.write(dumps(factory.emotes, separators=(',', ': ')))
f.close()

for subreddit in subreddits:
    subreddit_emotes = [x for x in factory.emotes if x['sr'] == subreddit]
    subreddit_emotes = sorted(subreddit_emotes, key = lambda x: x['image'])
    emotes_file = os.path.join('..', 'single_emotes', subreddit, 'emotes.json.gz')
    if not os.path.exists(os.path.dirname(emotes_file)):
        os.makedirs(os.path.dirname(emotes_file))
        
    emotes_data = dumps(subreddit_emotes, separators=(',', ': '));
    emotes_data_old = ''
    if (os.path.exists(emotes_file)):
        f = gzip.open(emotes_file, 'r')
        emotes_data_old = f.read()
        f.close()
    
    if emotes_data != emotes_data_old:
        f = gzip.open(emotes_file, 'wb')    
        f.write(emotes_data)
        f.close()
    
f = gzip.open(os.path.join('..', 'single_emotes', 'subreddits.json.gz'), 'wb')
f.write(dumps(subreddits, separators=(',', ': ')))
f.close()
