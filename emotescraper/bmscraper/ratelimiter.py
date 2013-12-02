"""
This is the MIT license: http://www.opensource.org/licenses/mit-license.php

Copyright 2011 Andrey Petrov and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
"""

import time
from threading import Lock


class RateExceededError(Exception):
    pass


class RateLimiter(object):
    def __init__(self, max_messages=10, every_seconds=1):
        self.max_messages = max_messages
        self.every_seconds = every_seconds
        self.lock = Lock()

        self._reset_window()

    def _reset_window(self):
        self.window_num = 0
        self.window_time = time.time()

    def acquire(self, block=True, timeout=None):
        self.lock.acquire()

        now = time.time()
        if now - self.window_time > self.every_seconds:
            # New rate window
            self._reset_window()

        if self.window_num >= self.max_messages:
            # Rate exceeding
            if not block:
                self.lock.release()
                raise RateExceededError()

            wait_time = self.window_time + self.every_seconds - now
            if timeout and wait_time > timeout:
                self.lock.release()
                time.sleep(timeout)

                raise RateExceededError()

            self.lock.release()
            time.sleep(wait_time)
            self.lock.acquire()

            self._reset_window()

        self.window_num += 1

        self.lock.release()