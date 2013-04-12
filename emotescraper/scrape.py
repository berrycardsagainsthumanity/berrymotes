from StringIO import StringIO
from cookielib import CookieJar
import itertools
from math import floor
import os
import urllib
import urllib2
import re
from collections import defaultdict
from json import dumps, loads
import time
from colormath.color_objects import LabColor, RGBColor

import tinycss
from PIL import Image
from colorific import extract_colors, rgb_to_hex

from data import *


stylesheet_url_format = "http://www.reddit.com/r/{}/stylesheet"

#subreddits = ["berrytubelounge"]
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

emote_regex = re.compile('a\[href[|^]?=["\']/([\w:]+)["\']\](:hover)?')
folder_regex = re.compile('http://(.)')

colour_data_file = open('colour_data.txt', 'rb')
colour_data = loads(colour_data_file.read())
colour_data_file.close()

def download_image(image_url):
    for i in range(0, 5):
        try:
            time.sleep(1)
            req = urllib2.Request(image_url, None, headers)
            http_conn = opener.open(req)
            image_str = http_conn.read()
            http_conn.close()
            return image_str
        except Exception, exc:
            if i > 4:
                return None
            print exc


def get_checked_images():
    checked_images = []
    checked_images_file = open('checked_images.txt', 'rb')
    for line in checked_images_file:
        checked_images.append(line.strip('\n'))
    checked_images_file.close()
    return checked_images


def extract_colours_from_emote(emote, bgimage):
    """
    :type bgimage: PIL.Image
    """
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
    cropped = bgimage.crop((x, y, x + width, y + height))
    name = max(emote['names'], key=len)
    if not os.path.exists('../single_emotes/{}'.format(emote['sr'])):
        os.makedirs('../single_emotes/{}'.format(emote['sr']))
    if not os.path.exists('../single_emotes/{}/{}.png'.format(emote['sr'], name)):
        out_image = open('../single_emotes/{}/{}.png'.format(emote['sr'], name), 'wb')
        cropped.save(out_image)
        out_image.close()
    palette = extract_colors(cropped, min_prominence=0.01, min_distance=20)
    print "Found colours: {} for {}".format(','.join(rgb_to_hex(c.value) for c in palette.colors), name)
    return_colours = []
    #Ignore the background colour processing. Most emotes are transparent background, and we want the prominent colours.
    if palette.bgcolor:
        colour, prominence = palette.bgcolor
        lab = RGBColor(*colour).convert_to('lab')
        return_colours.append([lab.lab_l, lab.lab_a, lab.lab_b, round(prominence * 10000)/10000])
    for colour, prominence in palette.colors:
        lab = RGBColor(*colour).convert_to('lab')
        return_colours.append([lab.lab_l, lab.lab_a, lab.lab_b, round(prominence * 10000)/10000])

    return return_colours


def process_image_colours(group, image_url, file_name, folder_name):
    if '{}/{}'.format(folder_name, file_name) not in colour_data:
        emote_colour_data = {}
        image_buffer = StringIO(download_image(image_url))
        image = Image.open(image_buffer)
        for emote in group:
            emote_colour_data[emote['names'][0]] = extract_colours_from_emote(emote, image)
        colour_data['{}/{}'.format(folder_name, file_name)] = emote_colour_data


def scrape():
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
        if not stylesheet:
            continue
        for rule in stylesheet.rules:
            if emote_regex.match(rule.selector.as_css()):
                for match in emote_regex.finditer(rule.selector.as_css()):
                    rules = {}
                    for declaration in rule.declarations:
                        if declaration.name in rules_we_care_about:
                            name = declaration.name
                            if name == 'background-position':
                                val = ['{}{}'.format(v.value, v.unit if v.unit else '') for v in declaration.value if
                                       v.value != ' ']
                            else:
                                val = declaration.value[0].value
                            if match.group(2):
                                name = 'hover-' + name
                            rules[name] = val
                            emotes_staging[match.group(1)].update(rules)

        key_func = lambda e: e[1]
        for emote, group in itertools.groupby(sorted(emotes_staging.iteritems(), key=key_func), key_func):
            emote['names'] = [a[0].encode('ascii', 'ignore') for a in group]
            for name in emote['names']:
                meta_data = next((x for x in emote_info if x['name'] == name), None)
                if meta_data:
                    emote.update(meta_data)
                    break
                if subreddit in nsfw_subreddits:
                    emote['nsfw'] = True
            emote['sr'] = subreddit


            # need at least an image for a ponymote. Some trash was getting in.
            # 1500 pixels should be enough for anyone!
            if ('background-image' in emote
                and emote['background-image'] not in image_blacklist
                and 'height' in emote and emote['height'] < 1500
                and 'width' in emote and emote['width'] < 1500):
                if emote['background-image'] in colour_data:
                    sheet_data = colour_data[emote['background-image']]
                    for emote_name, data in sheet_data.items():
                        if emote_name in emote['names']:
                            emote['c'] = data
                emotes.append(emote)
            else:
                print "Discarding {}".format(emote)
        #dedupe, subreddits list order wins
    print "deduping"
    for subreddit in subreddits:
        for subreddit_emote in [x for x in emotes if x['sr'] == subreddit]:
            for emote in [x for x in emotes if x['sr'] != subreddit]:
                for name in subreddit_emote['names']:
                    if name in emote['names']:
                        emote['names'].remove(name)
                        if len(emote['names']) == 0:
                            emotes.remove(emote)

    # Check for apngs.
    if not os.path.exists('../images'):
        os.makedirs('../images')
    checked_images = get_checked_images()
    checked_images_file = open('checked_images.txt', 'a')
    key_func = lambda e: e['background-image']
    for image_url, group in itertools.groupby(sorted(emotes, key=key_func), key_func):
        group = list(group)
        file_name = image_url[image_url.rfind('/') + 1:]
        folder_name = folder_regex.search(image_url).group(1)
        folder_array = ['../images', folder_name]
        path_array = folder_array[:]
        path_array.append(file_name)
        file_path = '/'.join(path_array)
        # If we've persisted it already it's an apng. This may change later if we decide to cache \\everything
        process_image_colours(group, image_url, file_name, folder_name)
        if os.path.isfile(file_path):
            for emote in group:
                url_format = 'http://backstage.berrytube.tv/marminator/images/{}/{}'
                emote['apng_url'] = url_format.format(folder_name, file_name)
            print "Marking emote as apng: " + file_name
        else:
            if image_url in checked_images:
                print "Skipping image, in the checked list: " + image_url
                continue

            image_str = download_image(image_url)
            if not image_str:
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
                checked_images_file.write(image_url + '\n')
                print "Didn't find an apng: " + image_url
    emote_data_file = open('../js/berrymotes_data.js', 'wb')
    emote_data_file.write(''.join(["var berryEmotes=", dumps(emotes, separators=(',', ':')), ";"]))
    emote_data_file.close()

    colour_data_file = open('colour_data.txt', 'wb')
    colour_data_file.write(dumps(colour_data))
    colour_data_js = {}
    for data in colour_data.values():
        colour_data_js.update(data)
    colour_data_file = open('../js/berrymotes_colour_data.js', 'wb')
    colour_data_file.write(''.join(["var berryEmotesColours=", dumps(colour_data_js, separators=(',', ':')), ";"]))
    colour_data_file.close()

scrape()


