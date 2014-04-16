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

from .basic_emotes_processor import BasicEmotesProcessorFactory, BasicEmotesProcessor
from .apngcheck import APNGCheck
import os
from shutil import copyfile

import logging

logger = logging.getLogger(__name__)


class UserscriptEmotesProcessorFactory(BasicEmotesProcessorFactory):
    def __init__(self,
                 single_emotes_filename='single_emotes/{}/{}.png',
                 apng_dir='images',
                 apng_url='images/{}/{}'):
        BasicEmotesProcessorFactory.__init__(self, single_emotes_filename=single_emotes_filename)
        self.apng_dir = apng_dir
        self.apng_url = apng_url

    def new_processor(self, scraper=None, image_url=None, group=None):
        return UserscriptEmotesProcessor(scraper=scraper,
                                         image_url=image_url,
                                         group=group,
                                         single_emotes_filename=self.single_emotes_filename,
                                         apng_dir=self.apng_dir,
                                         apng_url=self.apng_url)


class UserscriptEmotesProcessor(BasicEmotesProcessor, APNGCheck):
    def __init__(self, scraper=None, image_url=None, group=None, single_emotes_filename=None,
                 apng_dir=None, apng_url=None):
        BasicEmotesProcessor.__init__(self,
                                      scraper=scraper,
                                      image_url=image_url,
                                      group=group,
                                      single_emotes_filename=single_emotes_filename)
        self.apng_dir = apng_dir
        self.apng_url = apng_url

        self._apng = None
        self._image_name = '{}/{}'.format(self.get_folder_name(self.image_url), self.get_file_name(self.image_url))

    def process_group(self):
        BasicEmotesProcessor.process_group(self)

    def process_emote(self, emote):
        BasicEmotesProcessor.process_emote(self, emote)
        if self._apng:
            with self.scraper.mutex:
                emote['apng_url'] = self._apng
        if 'tags' not in emote:
            with self.scraper.mutex:
                emote['tags'] = ['untagged', 'new']

    def load_image(self, image_file):
        BasicEmotesProcessor.load_image(self, image_file)
        if self.is_apng(self.image_data):
            self._apng = self.apng_url.format(self.get_folder_name(self.image_url), self.get_file_name(self.image_url))

            apng_file = self.get_file_path(self.image_url, rootdir=self.apng_dir)

            if not os.path.exists(os.path.dirname(apng_file)):
                try:
                    os.makedirs(os.path.dirname(apng_file))
                except OSError:
                    pass

            if not os.path.exists(apng_file):
                copyfile(image_file, apng_file)

    def extract_single_image(self, emote, image):
        cropped = BasicEmotesProcessor.extract_single_image(self, emote, image)
        return cropped
