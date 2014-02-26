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

import re
import os

class FileNameUtils(object):
    def get_folder_name(self, image_url):
        re_folder = re.compile('(.)\.thumbs.redditmedia.com')
        folder_name = re_folder.search(image_url)
        if not folder_name:
            return 't'
        else:
            return folder_name.group(1)
            
    def get_file_name(self, image_url):
        return image_url[image_url.rfind('/') + 1:]
            
    def get_file_path(self, image_url, rootdir='.'):
        file_name = self.get_file_name(image_url)
        folder_name = self.get_folder_name(image_url)
        
        file_path = [rootdir, folder_name]
        file_path.append(file_name)
        
        return os.path.sep.join(file_path)