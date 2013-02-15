from cookielib import CookieJar
import itertools
import os
import urllib
import tinycss
import urllib2
import re
from collections import defaultdict
from json import dumps
import time
from data import *

stylesheet_url_format = "http://www.reddit.com/r/{}/stylesheet"

# subreddits = ["berrytubelounge"]
emotes = []

user_agent = 'User-Agent: Ponymote harvester v1.0 by /u/marminatoror'
cj = CookieJar()
opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(cj), urllib2.HTTPHandler())
formdata = {"user": "ponymoteharvester", "passwd": "berry_punch", "rem": False}
headers = {'User-Agent': user_agent}
req = urllib2.Request("http://www.reddit.com/api/login", None, headers)
http_conn = opener.open(req, urllib.urlencode(formdata))
http_conn.close()
rules_we_care_about = ['width', 'height', 'background-image', 'background-position']

emote_regex = re.compile('a\[href\|?="/([\w]+)')
folder_regex = re.compile('http://(.)')

for subreddit in subreddits:
    skip = False
    stylesheet = None
    for i in range(0, 5):
        time.sleep(1)
        try:
            req = urllib2.Request(stylesheet_url_format.format(subreddit), None, headers)
            http_conn = opener.open(req)
            parser = tinycss.make_parser('page3')
            sheet_string = http_conn.read()
            stylesheet = parser.parse_stylesheet(unicode(sheet_string, errors='ignore'))
            http_conn.close()
            break
        except Exception, exc:
            if i > 4:
                skip = True
            print exc
    if skip:
        continue
    print "Subreddit:{}".format(subreddit)
    emotes_staging = defaultdict(dict)

    for rule in stylesheet.rules:
        if emote_regex.match(rule.selector.as_css()):
            for match in emote_regex.finditer(rule.selector.as_css()):
                rules = {}
                for declaration in rule.declarations:
                    if declaration.name in rules_we_care_about:
                        if declaration.name == 'background-position':
                            val = ['{}{}'.format(v.value, v.unit if v.unit else '') for v in declaration.value if
                                   v.value != ' ']
                        else:
                            val = declaration.value[0].value
                        rules[declaration.name] = val
                    emotes_staging[match.group(1)].update(rules)

    key_func = lambda e: e[1]
    for emote, group in itertools.groupby(sorted(emotes_staging.iteritems(), key=key_func), key_func):
        emote['names'] = [a[0].encode('ascii', 'ignore') for a in group]
        for name in emote['names']:
            meta_data = next((x for x in emote_info if x['sr'] == subreddit and x['name'] == name), None)
            if meta_data:
                emote.update(meta_data)
                break
        emote['sr'] = subreddit
        # need at least an image for a ponymote. Some trash was getting in.
        if 'background-image' in emote:
            emotes.append(emote)
#dedupe, subreddits list order wins
for subreddit in subreddits:
    for subreddit_emote in [x for x in emotes if x['sr'] == subreddit]:
        for emote in [x for x in emotes if x['sr'] != subreddit]:
            for name in subreddit_emote['names']:
                if name in emote['names']:
                    print "deduping name: " + name
                    emote['names'].remove(name)
                    if len(emote['names']) == 0:
                        print "removing: " + name
                        emotes.remove(emote)

# Check for apngs. For now we are just going to tag these and try and do some browser side canvas magic to display them
# in browsers that don't support apng.
if not os.path.exists('../images'):
    os.makedirs('../images')

key_func = lambda e: e['background-image']
for image_url, group in itertools.groupby(sorted(emotes, key=key_func), key_func):
    file_name = image_url[image_url.rfind('/') + 1:]
    folder_name = folder_regex.search(image_url).group(1)
    folder_array = ['../images', folder_name]
    path_array = folder_array[:]
    path_array.append(file_name)
    file_path = '/'.join(path_array)
    # If we've persisted it already it's an apng. This may change later if we decide to cache \\everything
    if os.path.isfile(file_path):
        for emote in group:
            url_format = 'http://backstage.berrytube.tv/marminator/images/{}/{}'
            emote['apng_url'] = url_format.format(folder_name, file_name)
        print "Marking emote as apng: " + file_name
    else:
        if image_url in checked_images:
            print "Skipping image, in the checked list: " + image_url
            continue
        group = list(group)

        skip = False
        for i in range(0, 5):
            try:
                time.sleep(1)
                req = urllib2.Request(image_url, None, headers)
                http_conn = opener.open(req)
                image_str = http_conn.read()
                http_conn.close()
            except Exception, exc:
                if i > 4:
                    skip = True
                print exc
        if skip:
            continue
        if 'acTL' in image_str[0:image_str.find('IDAT')]:
            for emote in group:
                if not os.path.exists('/'.join(folder_array)):
                    os.makedirs('/'.join(folder_array))
                image_file = open(file_path, 'wb')
                image_file.write(image_str)
                image_file.close()
                url_format = 'http://backstage.berrytube.tv/marminator/images/{}/{}'
                emote['apng_url'] = url_format.format(folder_name, file_name)
                print 'saved an apng. Url: {}, names: {}, sr: {} '.format(image_url, emote['names'], emote['sr'])
        else:
            print "Didn't find an apng: " + image_url
emote_data_file = open('../js/berrymotes_data.js', 'wb')
emote_data_file.write("var berryEmotes = {};".format(dumps(emotes)))
emote_data_file.close()

