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

from workerpool import Job

import logging
logger = logging.getLogger(__name__) 

class AbstractEmotesProcessorFactory(object):
    def __init__(self):
        pass
    
    def new_processor(self, scraper=None, image_url=None, group=None):
        raise NotImplementedError()
    
class AbstractEmotesProcessor(Job):
    def __init__(self, scraper=None, image_url=None, group=None):
        super(AbstractEmotesProcessor, self).__init__()
        self.scraper = scraper
        self.image_url = image_url
        self.group = group
    
    def run(self):
        try:
            logger.debug('Processing {}'.format(self.image_url))
                        
            self.process_group()
        except Exception, e:
            logger.exception(e)
        
    def process_group(self):        
        for emote in self.group:
            self.process_emote(emote)
            
    def process_emote(self, emote):
        raise NotImplementedError()