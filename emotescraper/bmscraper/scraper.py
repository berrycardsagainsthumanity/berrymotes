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
from datetime import datetime, timedelta
from dateutil.tz import tzutc
import requests
from workerpool import WorkerPool
import threading
import tinycss
import re
from collections import defaultdict
import itertools
import os
from os import path
from downloadjob import DownloadJob
from filenameutils import FileNameUtils
from multiprocessing import cpu_count
from dateutil import parser
import re

import logging

logger = logging.getLogger(__name__)

re_numbers = re.compile(r"\d+")

def _remove_duplicates(seq):
    '''https://stackoverflow.com/questions/480214/how-do-you-remove-duplicates-from-a-list-in-python-whilst-preserving-order'''
    seen = set()
    seen_add = seen.add
    return [ x for x in seq if x not in seen and not seen_add(x)]

class BMScraper(FileNameUtils):
    def __init__(self, processor_factory):
        self.subreddits = []
        self.user = None
        self.password = None
        self.emotes = []
        self.image_blacklist = []
        self.nsfw_subreddits = []
        self.emote_info = []
        self.tags_data = {}
        self.cache_dir = '../images'
        self.workers = cpu_count()
        self.processor_factory = processor_factory
        self.rate_limit_lock = None

        self.mutex = threading.RLock()

        self._requests = requests.Session()
        self._requests.headers = {'user-agent', 'User-Agent: Ponymote harvester v2.0 by /u/marminatoror'}
        
    def _emote_post_preferance(self):
        '''A emote's first name will be used to post. Some names are preferred over other names. We re-order the names here.''' 
        
        # We push all the numbered names back. They are generally not very descriptive.
        for emote in self.emotes:
            numbered_names = []
            descriptive_names = []
            for name in emote['names']:
                if len(re_numbers.findall(name)) > 0:
                    numbered_names.append(name)
                else:
                    descriptive_names.append(name)
            emote['names'] = descriptive_names + numbered_names
    
    def _dedupe_emotes(self):
        for subreddit in self.subreddits:
            subreddit_emotes = [x for x in self.emotes if x['sr'] == subreddit]
            other_subreddits_emotes = [x for x in self.emotes if x['sr'] != subreddit]
            for subreddit_emote in subreddit_emotes:
                for emote in other_subreddits_emotes:
                    
                    # merge (move all names to one emote) both emotes if they use the same image source
                    # This method is not perfect. It ignores CSS attributes.
                    # A emote using the same image source (While still being visually different using CSS)
                    # will still be incorrectly merged.
                    # 
                    # This method does not do visual image comparison. Visually equal images will not be merged.
                    if (emote['background-image'] == subreddit_emote['background-image'] and
                        emote.get('background-position') == subreddit_emote.get('background-position') and
                        emote.get('height') == subreddit_emote.get('height') and
                        emote.get('width') == subreddit_emote.get('width') ):
                        
                        subreddit_emote['names'] = subreddit_emote['names'] + emote['names']
                        _remove_duplicates(subreddit_emote['names'])
                        self.emotes.remove(emote)
                    else:
                        # Remove duplicate names. The subreddit scraping order will determine which emote keeps there name.
                        for name in subreddit_emote['names']:
                            if name in emote['names']:
                                #logger.debug("Deduping: {}".format(name))
                                emote['names'].remove(name)
                                if len(emote['names']) == 0:
                                    self.emotes.remove(emote)


    def _fetch_css(self):
        logger.debug("Fetching css using {} threads".format(self.workers))
        workpool = WorkerPool(size=self.workers)

        for subreddit in self.subreddits:
            workpool.put(DownloadJob(self._requests,
                                     'https://pay.reddit.com/r/{}/stylesheet'.format(subreddit),
                                     retry=5,
                                     rate_limit_lock=self.rate_limit_lock,
                                     callback=self._callback_fetch_stylesheet,
                                     **{'subreddit': subreddit}))

        workpool.shutdown()
        workpool.join()

    def _download_images(self):
        logger.debug("Downloading images using {} threads".format(self.workers))
        workpool = WorkerPool(size=self.workers)

        # cache emotes
        key_func = lambda e: e['background-image']
        with self.mutex:
            for image_url, group in itertools.groupby(sorted(self.emotes, key=key_func), key_func):
                if not image_url:
                    continue

                file_path = self.get_file_path(image_url, rootdir=self.cache_dir)
                if not os.path.isfile(file_path):
                    workpool.put(DownloadJob(self._requests,
                                             image_url,
                                             retry=5,
                                             rate_limit_lock=self.rate_limit_lock,
                                             callback=self._callback_download_image,
                                             **{'image_path': file_path}))

        workpool.shutdown()
        workpool.join()

    def _process_emotes(self):
        logger.debug("Processing emotes using {} threads".format(self.workers))
        workpool = WorkerPool(self.workers)

        key_func = lambda e: e['background-image']
        with self.mutex:
            for image_url, group in itertools.groupby(sorted(self.emotes, key=key_func), key_func):
                if not image_url:
                    continue

                workpool.put(self.processor_factory.new_processor(scraper=self, image_url=image_url, group=list(group)))

        workpool.shutdown()
        workpool.join()

    def scrape(self):
        # Login
        if self.user and self.password:
            body = {'user': self.user, 'passwd': self.password, "rem": False}
            self.rate_limit_lock and self.rate_limit_lock.acquire()
            response = self._requests.post('http://www.reddit.com/api/login', body)
            #cookie = response.headers['set-cookie']
            #self._headers['cookie'] = cookie[:cookie.index(';')]

        self._fetch_css()

        self._dedupe_emotes()
        
        self._emote_post_preferance()
        
        self._download_images()

        self._process_emotes()

        logger.info('All Done')

    def _parse_css(self, data):
        cssparser = tinycss.make_parser('page3')
        css = cssparser.parse_stylesheet(data)

        if not css:
            return None

        re_emote = re.compile('a\[href[|^$]?=["\']/([\w:]+)["\']\](:hover)?(\sem|\sstrong)?')
        emotes_staging = defaultdict(dict)

        for rule in css.rules:
            if re_emote.match(rule.selector.as_css()):
                for match in re_emote.finditer(rule.selector.as_css()):
                    rules = {}

                    for declaration in rule.declarations:
                        if match.group(3):
                            name = match.group(3).strip() + '-' + declaration.name
                            rules[name] = declaration.value.as_css()
                            emotes_staging[match.group(1)].update(rules)
                        elif declaration.name in ['text-align',
                                                  'line-height',
                                                  'color'] or declaration.name.startswith('font') or declaration.name.startswith('text'):
                            name = 'text-' + declaration.name
                            rules[name] = declaration.value.as_css()
                            emotes_staging[match.group(1)].update(rules)
                        elif declaration.name in ['width',
                                                   'height',
                                                   'background-image',
                                                   'background-position',
                                                   'background', ]:
                            name = declaration.name
                            if name == 'background-position':
                                val = ['{}{}'.format(v.value, v.unit if v.unit else '') for v in declaration.value if
                                       v.value != ' ']
                            else:
                                val = declaration.value[0].value
                            if match.group(2):
                                name = 'hover-' + name
                            rules[name] = val
                            emotes_staging[match.group(1)].update(rules)
        return emotes_staging

    def _callback_fetch_stylesheet(self, response, subreddit=None):
        if not response:
            logger.error("Failed to fetch css for {}".format(subreddit))
            return

        if response.status_code != 200:
            logger.error("Failed to fetch css for {} (Status {})".format(subreddit, response.status_code))
            return

        emotes_staging = self._parse_css(response.text)
        if not emotes_staging:
            return

        key_func = lambda e: e[1]
        for emote, group in itertools.groupby(sorted(emotes_staging.iteritems(), key=key_func), key_func):
            emote['names'] = [a[0].encode('ascii', 'ignore') for a in group]
            
            full_names = []
            for name in emote['names']:
                full_names.append('r/'+subreddit+'/'+name)
            emote['names'] = emote['names'] + full_names
            
            for name in emote['names']:
                meta_data = next((x for x in self.emote_info if x['name'] == name), None)

                if meta_data:
                    for key, val in meta_data.iteritems():
                        if key != 'name':
                            emote[key] = val

                tag_data = None
                if name in self.tags_data:
                    tag_data = self.tags_data[name]

                if tag_data:
                    if 'tags' not in emote:
                        emote['tags'] = []
                    logger.debug('Tagging: {} with {}'.format(name, tag_data))
                    emote['tags'].extend(k for k, v in tag_data['tags'].iteritems() if v['score'] >= 1)
                    if tag_data.get('specialTags'):
                        emote['tags'].extend(tag_data['specialTags'])

                    if 'added_date' in tag_data:
                        added_date = parser.parse(tag_data['added_date'])
                        now = datetime.now(tzutc())
                        if now - added_date < timedelta(days=7):
                            emote['tags'].append('new')

            if subreddit in self.nsfw_subreddits:
                emote['nsfw'] = True
            emote['sr'] = subreddit

            # Sometimes people make css errors, fix those.
            if ('background-image' not in emote
                and 'background' in emote
                and emote['background'].startswith('http')):
                emote['background-image'] = emote['background']
                del emote['background']

            # need at least an image for a ponymote. Some trash was getting in.
            # 1500 pixels should be enough for anyone!
            if ('background-image' in emote
                and emote['background-image'] not in self.image_blacklist
                and 'height' in emote and emote['height'] < 1500
                and 'width' in emote and emote['width'] < 1500):
                with self.mutex:
                    self.emotes.append(emote)
            else:
                logger.warn('Discarding emotes {}'.format(emote['names'][0]))

    def _callback_download_image(self, response, image_path=None):
        if not image_path:
            return

        data = response.content
        if not data:
            return

        image_dir = os.path.dirname(image_path)
        if not os.path.exists(image_dir):
            try:
                os.makedirs(image_dir)
            except OSError:
                pass

        with open(image_path, 'wb') as f:
            f.write(data)

