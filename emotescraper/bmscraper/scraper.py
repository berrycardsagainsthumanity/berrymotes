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

import urllib3
from workerpool import WorkerPool
import threading
import tinycss
import re
from collections import defaultdict
import itertools
import os
from downloadjob import DownloadJob
from filenameutils import FileNameUtils
from multiprocessing import cpu_count

import logging
logger = logging.getLogger(__name__) 

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
        self.cache_dir = 'cache'
        self.workers = cpu_count()
        self.processor_factory = processor_factory
        self.rate_limit_lock = None
                
        self.mutex = threading.RLock()
                
        self._poolmanager = urllib3.PoolManager(num_pools=50)
        self._headers = {}
        self._headers['user-agent'] = 'User-Agent: Ponymote harvester v2.0 by /u/marminatoror'
        
    def _dedupe_emotes(self):
        with self.mutex:
            for subreddit in self.subreddits:
                for subreddit_emote in [x for x in self.emotes if x['sr'] == subreddit]:
                    for emote in [x for x in self.emotes if x['sr'] != subreddit]:
                        for name in subreddit_emote['names']:
                            if name in emote['names']:
                                emote['names'].remove(name)
                                if len(emote['names']) == 0:
                                    self.emotes.remove(emote)
            
    def _fetch_css(self):
        logger.debug("Fetching css using %s threads", self.workers)        
        workpool = WorkerPool(size=self.workers)
        
        for subreddit in self.subreddits:
            workpool.put(DownloadJob(self._poolmanager, 
                                     'http://www.reddit.com/r/%s/stylesheet' % subreddit,
                                     headers=self._headers,
                                     retry=5,
                                     rate_limit_lock=self.rate_limit_lock,
                                     callback = self._callback_fetch_stylesheet, 
                                     **{'subreddit': subreddit}))
            
        workpool.shutdown()
        workpool.join()
        
    def _download_images(self):        
        logger.debug("Downloading images using %s threads", self.workers)
        workpool = WorkerPool(size=self.workers)
        
        # cache emotes
        key_func = lambda e: e['background-image']
        with self.mutex:
            for image_url, group in itertools.groupby(sorted(self.emotes, key=key_func), key_func):
                if not image_url:
                    continue       
                
                file_path = self.get_file_path(image_url, rootdir=self.cache_dir)
                if not os.path.isfile(file_path):
                    workpool.put(DownloadJob(self._poolmanager, 
                                             image_url, 
                                             headers=self._headers,
                                             retry=5, 
                                             rate_limit_lock=self.rate_limit_lock,
                                             callback=self._callback_download_image, 
                                             **{'image_path': file_path}))
                
        workpool.shutdown()
        workpool.wait()      
            
    def _process_emotes(self):        
        logger.debug("Processing emotes using %s threads", self.workers)
        workpool = WorkerPool(self.workers)
        
        key_func = lambda e: e['background-image']
        with self.mutex:
            for image_url, group in itertools.groupby(sorted(self.emotes, key=key_func), key_func):
                if not image_url:
                    continue
                
                workpool.put(self.processor_factory.new_processor(scraper=self, image_url=image_url, group=list(group)))
                
        workpool.shutdown()
        workpool.wait()
            
    def scrape(self):
        # Login
        if self.user and self.password:
            body = {'user': self.user, 'passwd': self.password, "rem": False}
            self.rate_limit_lock and self.rate_limit_lock.acquire()
            response = self._poolmanager.request('POST', 'http://www.reddit.com/api/login', body)
            cookie = response.headers['set-cookie'];
            self._headers['cookie'] = cookie[:cookie.index(';')]
            
            
        self._fetch_css()
        
        self._dedupe_emotes()
        
        self._download_images()
        
        self._process_emotes()
        
        logger.info('All Done')
        
    def _parse_css(self, data):            
        cssparser = tinycss.make_parser('page3')
        css = cssparser.parse_stylesheet(data)
        
        if not css:
            return None
        
        re_emote = re.compile('a\[href[|^$]?=["\']/([\w:]+)["\']\](:hover)?')        
        emotes_staging = defaultdict(dict)
        
        for rule in css.rules:
            if re_emote.match(rule.selector.as_css()):
                for match in re_emote.finditer(rule.selector.as_css()):
                    rules = {}
                    for declaration in rule.declarations:
                        if declaration.name in ['width', 'height', 'background-image', 'background-position']:
                            name = declaration.name
                            if name == 'background-position':
                                val = ['%s%s' % (v.value, v.unit if v.unit else '') for v in declaration.value if v.value != ' ']
                            else:
                                val = declaration.value[0].value
                            if match.group(2):
                                name = 'hover-' + name
                            rules[name] = val
                            emotes_staging[match.group(1)].update(rules)
        return emotes_staging
        
    def _callback_fetch_stylesheet(self, response, subreddit=None):
        if not response:
            logger.error("Failed to fetch css for %s", subreddit)
            return        
        
        if response.status != 200:
            logger.error("Failed to fetch css for %s (Status %s)", subreddit, response.status)
            return
        
        emotes_staging = self._parse_css(unicode(response.data, errors='ignore'))
        if not emotes_staging:
            return
        
        key_func = lambda e: e[1]
        for emote, group in itertools.groupby(sorted(emotes_staging.iteritems(), key=key_func), key_func):
            emote['names'] = [a[0].encode('ascii', 'ignore') for a in group]
            for name in emote['names']:
                meta_data = next((x for x in self.emote_info if x['name'] == name), None)
                    
                if meta_data:
                    emote.update(meta_data)
                    break
            
                tag_data = None
                if name in self.tags_data:
                    tag_data = self.tags_data[name]
            
                if tag_data:
                    logger.debug('Tagging: %s with %s', name, tag_data)
                    emote['tags'] = [k for k,v in tag_data['tags'].iteritems() if v['score'] >= 1]
                    if 'specialTags' in tag_data:
                        emote['tags'].extend(tag_data['specialTags'])

            if subreddit in self.nsfw_subreddits:
                emote['nsfw'] = True
            emote['sr'] = subreddit


            # need at least an image for a ponymote. Some trash was getting in.
            # 1500 pixels should be enough for anyone!
            if ('background-image' in emote
                and emote['background-image'] not in self.image_blacklist
                and 'height' in emote and emote['height'] < 1500
                and 'width' in emote and emote['width'] < 1500):
                    with self.mutex:
                        self.emotes.append(emote)
            else:
                logger.warn('Discarding emotes %s', emote['names'][0])
            
    def _callback_download_image(self, response, image_path=None):
        if not image_path:
            return
        
        data = response.data
        if not data:
            return
        
        image_dir = os.path.dirname(image_path)
        if not os.path.exists(image_dir):
            try:
                os.makedirs(image_dir)
            except OSError:
                pass
            
        f = open(image_path, 'wb')
        f.write(data)
        f.close()