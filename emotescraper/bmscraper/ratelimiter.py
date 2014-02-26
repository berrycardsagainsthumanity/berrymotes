# Taken from: http://code.activestate.com/recipes/578659-python-3-token-bucket-rate-limit/
# MIT License:
#The MIT License (MIT)
#
#Copyright (c) <year> <copyright holders>
#
#Permission is hereby granted, free of charge, to any person obtaining a copy
#of this software and associated documentation files (the "Software"), to deal
#in the Software without restriction, including without limitation the rights
#to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
#copies of the Software, and to permit persons to whom the Software is
#furnished to do so, subject to the following conditions:
#
#The above copyright notice and this permission notice shall be included in
#all copies or substantial portions of the Software.
#
#THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
#AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
#OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
#THE SOFTWARE.

from time import time, sleep
from threading import Lock


class TokenBucket:
    """
    An implementation of the token bucket algorithm.
    """

    def __init__(self, rate=1, per_seconds=1, block=True):
        self.tokens = rate
        self.rate = rate
        self.block = True
        self.last = time()
        self.lock = Lock()
        self.per_seconds = per_seconds

    def set_rate(self, rate):
        with self.lock:
            self.rate = rate
            self.tokens = self.rate

    def increment(self):
        now = time()
        lapse = now - self.last
        self.last = now
        self.tokens += (lapse / self.per_seconds) * self.rate
        if self.tokens > self.rate:
            self.tokens = self.rate

    def acquire(self):
        with self.lock:
            if not self.rate:
                return 0

            self.increment()

            if self.block and self.tokens < 1:
                sleep_time = (self.per_seconds / self.rate) - self.tokens
                sleep(abs(sleep_time))

            self.tokens -= 1

            if self.block:
                return 0
            else:
                return abs((self.per_seconds / self.rate) - self.tokens)


