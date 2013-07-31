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

from .abstract_emotes_processor import AbstractEmotesProcessorFactory, AbstractEmotesProcessor
from ..filenameutils import FileNameUtils
from PIL import Image
from StringIO import StringIO
import os

import logging
logger = logging.getLogger(__name__) 

class BasicEmotesProcessorFactory(AbstractEmotesProcessorFactory):
    def __init__(self, single_emotes_filename=None):
        self.single_emotes_filename = single_emotes_filename
        
    def new_processor(self, scraper=None, image_url=None, group=None):
        return  BasicEmotesProcessor(scraper=scraper,
                                          image_url=image_url,
                                          group=group,
                                          single_emotes_filename=self.single_emotes_filename)
    
    
class BasicEmotesProcessor(AbstractEmotesProcessor, FileNameUtils):
    def __init__(self, scraper=None, image_url=None, group=None, single_emotes_filename=None):
        AbstractEmotesProcessor.__init__(self, scraper=scraper, image_url=image_url, group=group)
        
        self.single_emotes_filename = single_emotes_filename        
        self.image_data = None
        self.image = None
        
        
    def process_group(self):
        self.load_image(self.get_file_path(self.image_url, self.scraper.cache_dir))
        AbstractEmotesProcessor.process_group(self)
        
    def process_emote(self, emote):
        cropped = self.extract_single_image(emote, self.image)
        if cropped:
            file_name = self.single_emotes_filename % (emote['sr'], max(emote['names'], key=len))
            
            try:
                if not os.path.exists(file_name):
                    if not os.path.exists(os.path.dirname(file_name)):
                        try:
                            os.makedirs(os.path.dirname(file_name))
                        except OSError:
                            pass
                        
                    f = open(file_name, 'wb')
                    cropped.save(f)
                    f.close()
            except Exception, e:
                logger.exception(e)
                raise e
        
    def load_image(self, image_file):                
        f = open(image_file, 'rb')
        self.image_data = f.read()
        f.close()
                     
        self.image = Image.open(StringIO(self.image_data))  
        
    def extract_single_image(self, emote, image):
        x = 0
        y = 0
        width = emote['width']
        height = emote['height']
        if 'background-position' in emote:
            percentage = emote['background-position'][0].endswith('%') or emote['background-position'][1].endswith('%')
            x = int(emote['background-position'][0].strip('-').strip('px').strip('%'))
            y = int(emote['background-position'][1].strip('-').strip('px').strip('%'))
            if percentage:
                x = width * x / 100
                y = height * y / 100
        
        return image.crop((x, y, x + width, y + height))