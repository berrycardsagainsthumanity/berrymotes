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
from colorific import extract_colors
from colormath.color_objects import RGBColor

import logging
logger = logging.getLogger(__name__)

class UserscriptEmotesProcessorFactory(BasicEmotesProcessorFactory):
    def __init__(self, 
                 single_emotes_filename='single_emotes' + os.path.sep + '%s' + os.path.sep + '%s.png', 
                 apng_dir='images', 
                 apng_url='images/%s/%s'):
        BasicEmotesProcessorFactory.__init__(self, single_emotes_filename=single_emotes_filename)
        self.color_data = {}
        self.apng_dir = apng_dir
        self.apng_url = apng_url
        
    def new_processor(self, scraper=None, image_url=None, group=None):
        return  UserscriptEmotesProcessor(scraper=scraper,
                                          image_url=image_url,
                                          group=group,
                                          single_emotes_filename=self.single_emotes_filename,
                                          color_data=self.color_data,
                                          apng_dir=self.apng_dir,
                                          apng_url=self.apng_url)
    
class UserscriptEmotesProcessor(BasicEmotesProcessor, APNGCheck):
    def __init__(self, scraper=None, image_url=None, group=None, single_emotes_filename=None, color_data={}, apng_dir=None, apng_url=None):
        BasicEmotesProcessor.__init__(self,
                                         scraper=scraper,
                                         image_url=image_url,
                                         group=group,
                                         single_emotes_filename=single_emotes_filename)
        self.color_data = color_data
        self.apng_dir = apng_dir
        self.apng_url = apng_url
        
        self._emote_color_data = {}
        self._apng = None
        self._image_name = '%s/%s' % (self.get_folder_name(self.image_url), self.get_file_name(self.image_url)) 
    
    def process_group(self):
        with self.scraper.mutex:
            if self._image_name in self.color_data:
                self._emote_color_data = self.color_data[self._image_name] 
        
        BasicEmotesProcessor.process_group(self)
        
        with self.scraper.mutex:
                self.color_data[self._image_name] = self._emote_color_data
           
    def process_emote(self, emote):
        BasicEmotesProcessor.process_emote(self, emote)
        if self._apng:
            with self.scraper.mutex:
                emote['apng_url'] = self._apng
        
    def load_image(self, image_file):
        BasicEmotesProcessor.load_image(self, image_file)
        if self.is_apng(self.image_data):
            self._apng = self.apng_url % (self.get_folder_name(self.image_url), self.get_file_name(self.image_url))
            
            apng_file = self.get_file_path(self.image_url, rootdir=self.apng_dir)
            
            if not os.path.exists(os.path.dirname(apng_file)):
                try:
                    os.makedirs(os.path.dirname(apng_file))
                except OSError, e:
                    pass
                
            if not os.path.exists(apng_file):
                copyfile(image_file, apng_file)
           
    def extract_single_image(self, emote, image):
        cropped = BasicEmotesProcessor.extract_single_image(self, emote, image)
        
        emote_color_data = None
        with self.scraper.mutex:
            if emote['names'][0] in self._emote_color_data:
                emote_color_data = self._emote_color_data[emote['names'][0]]
            
        if not emote_color_data and cropped:
            emote_color_data = self._extract_colors(cropped)
             
        with self.scraper.mutex:        
            self._emote_color_data[emote['names'][0]] = emote_color_data
            
        return cropped
           
    def _extract_colors(self, image):
        result = []
        palette = extract_colors(image, min_prominence=0.01, min_distance=20)
        if palette.bgcolor:
            color, prominence = palette.bgcolor
            lab = RGBColor(*color).convert_to('lab')
            result.append([lab.lab_l, lab.lab_a, lab.lab_b, round(prominence * 10000)/10000])
        for colour, prominence in palette.colors:
            lab = RGBColor(*colour).convert_to('lab')
            result.append([lab.lab_l, lab.lab_a, lab.lab_b, round(prominence * 10000)/10000])
            
        return result