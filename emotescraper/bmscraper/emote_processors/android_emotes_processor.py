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

from .basic_emotes_processor import BasicEmotesProcessorFactory, BasicEmotesProcessor
from .apngcheck import APNGCheck
import os
from subprocess import check_call
from shutil import copyfile
from glob import glob
from PIL import Image

import logging
logger = logging.getLogger(__name__)

class AndroidEmotesProcessorFactory(BasicEmotesProcessorFactory):
    def __init__(self, 
                 single_emotes_filename=os.path.join('single_emotes', '{}', '{}.png'),
                 apng_dir='images', 
                 apng_url='images/{}/{}'):
        BasicEmotesProcessorFactory.__init__(self, single_emotes_filename=single_emotes_filename)
        self.emotes = {}
        self.singe_emotes_filename_apng = os.path.dirname(self.single_emotes_filename) + os.path.sep + '{}_frame_{:0>3}.png'
        
    def new_processor(self, scraper=None, image_url=None, group=None):
        return  AndroidEmotesProcessor(scraper=scraper,
                                          image_url=image_url,
                                          group=group,
                                          single_emotes_filename=self.single_emotes_filename,
                                          emotes=self.emotes,
                                          single_emotes_filename_apng=self.singe_emotes_filename_apng)
        
        
class AndroidEmotesProcessor(BasicEmotesProcessor, APNGCheck):
    def __init__(self, scraper=None, image_url=None, group=None, single_emotes_filename=None, emotes=None, single_emotes_filename_apng=None):
        BasicEmotesProcessor.__init__(self,
                                         scraper=scraper,
                                         image_url=image_url,
                                         group=group,
                                         single_emotes_filename=single_emotes_filename)
        self._image_name = '{}/{}'.format(self.get_folder_name(self.image_url), self.get_file_name(self.image_url))
        self._emotes = emotes
        self._apng_frames = None
        self._single_emotes_filename_apng = single_emotes_filename_apng
        
    def load_image(self, image_file):
        BasicEmotesProcessor.load_image(self, image_file)
        if self.is_apng(self.image_data):
            self.image = None
            self._apng_frames = []
            
            apng_file = os.path.sep.join([self.scraper.cache_dir, 
                                          'apng', 
                                          self.get_folder_name(self.image_url), 
                                          self.get_file_name(self.image_url), 
                                          self.get_file_name(self.image_url)])
            
            if not os.path.exists(apng_file):
                if not os.path.exists(os.path.dirname(apng_file)):
                    try:
                        os.makedirs(os.path.dirname(apng_file))
                    except OSError:
                        pass 
        
                copyfile(image_file, apng_file)
                
            FNULL = open(os.devnull, 'wb')
            check_call(['apngdis', apng_file, 'frame_'], stdout=FNULL)
            FNULL.close()
            
            frames = sorted(glob(os.path.sep.join([os.path.dirname(apng_file), 'frame_*.png'])))
            delay_files = sorted(glob(os.path.sep.join([os.path.dirname(apng_file), 'frame_*.txt'])))
            assert len(frames) > 0, 'No frames found'
            
            delays = {}            
            default_delay = self._calculate_delay(delay_files[0])
            for delay_file in delay_files:
                delays[os.path.splitext(delay_file)[0] + '.png'] = self._calculate_delay(delay_file)
            
            for idx, frame in enumerate(frames):
                apng = {}
                apng['index'] = idx
                apng['image'] = Image.open(frame)
                
                if delays.has_key(frame):                         
                    apng['delay'] = delays[frame]
                else:
                    logger.warning('No delay found for "%s", using default ($s ms)', frame, default_delay)
                    apng['delay'] = default_delay
                
                self._apng_frames.append(apng)
                  
    def _calculate_delay(self, delay_file):
        # Calucate delay in ms
        f = open(delay_file, 'rb')
        delay_text = f.readline().strip()[6:]
        f.close()       
        
        return int(round(float(delay_text[0:delay_text.index('/')]) / float(delay_text[delay_text.index('/') + 1:]) * 1000))
        
    def process_emote(self, emote):
        if self.is_apng(self.image_data):
            logger.debug('Found apng image: %s', self._image_name)
            images = []
            for frame in self._apng_frames:
                cropped = self.extract_single_image(emote, frame['image'])
                
                file_name = self._single_emotes_filename_apng.format(emote['sr'], max(emote['names'], key=len), frame['index'])
                emote_url = '{}/{}_{:0>3}.png'.format(emote['sr'], max(emote['names'], key=len), frame['index'])
                
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
                
                image = {'image': emote_url,
                         'apng': True,
                         'index': frame['index'],
                         'delay': frame['delay']}
                images.append(image)
            
            for name in emote['names']:
                with self.scraper.mutex:
                    self._emotes[name] = images;
            
        else:
            BasicEmotesProcessor.process_emote(self, emote)
            emote_url = '{}/{}.png'.format(emote['sr'], max(emote['names'], key=len))
            for name in emote['names']:
                with self.scraper.mutex:
                    self._emotes[name] = [{'image': emote_url, 
                                           'apng':False}]    
