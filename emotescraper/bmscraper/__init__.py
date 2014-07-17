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

from .scraper import BMScraper
from .emote_processors import (BasicEmotesProcessorFactory,
                               UserscriptEmotesProcessorFactory,
                               AndroidEmotesProcessorFactory)

import logging

logging.getLogger(__name__).addHandler(logging.NullHandler())
