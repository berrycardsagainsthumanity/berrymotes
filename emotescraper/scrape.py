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

emote_info = [
    {
        'sr': 'ponyloungerts',
        'name': 'ajsbanana',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'ajshake',
        'nsfw': True
    },
    {
        'sr': 'ponyanarchism',
        'name': 'andy',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'bestcentaur',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'bigenough',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'books',
        'nsfw': True
    },
    {
        'sr': 'ponyanarchism',
        'name': 'books',
        'nsfw': True
    },
    {
        'sr': 'mlas1emotes',
        'name': 'buzzkillturtle',
        'nsfw': True
    },
    {
        'sr': 'daylightemotes',
        'name': 'coggler',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'derpyshake',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'fluttershake',
        'nsfw': True
    },
    {
        'sr': 'arborus',
        'name': 'fruitamad',
        'nsfw': True
    },
    {
        'sr': 'ponyanarchism',
        'name': 'fut1',
        'nsfw': True
    },
    {
        'sr': 'ponyanarchism',
        'name': 'fut4',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'fut1',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'fut4',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'futacute',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'futaplot',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'futapomf',
        'nsfw': True
    },
    {
        'sr': 'clopclop',
        'name': 'futashy',
        'nsfw': True
    },
    {
        'sr': 'clopclop',
        'name': 'rfutashy',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'goddamnitmango',
        'nsfw': True
    },
    {
        'sr': 'arborus',
        'name': 'hcstare',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'hom3rbutt',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'horsecock',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'horsedick',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'hugehorsedick',
        'nsfw': True
    },
    {
        'sr': 'mylittlebannertest',
        'name': 'jizz',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'kitty',
        'nsfw': True
    },
    {
        'sr': 'ponyloungerts',
        'name': 'konapenis',
        'nsfw': True
    },
    {
        'sr': 'mylittlemilkyway',
        'name': 'milkymic',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'orschemote',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'pinkieshake',
        'nsfw': True
    },
    {
        'sr': 'mylittlebannertest',
        'name': 'pone',
        'nsfw': True
    },
    {
        'sr': 'mylittlebannertest',
        'name': 'rainbowponysemen',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'rainbowshake',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'rarshake',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'rockhard',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'rvinylshake',
        'nsfw': True
    },
    {
        'sr': 'spaceclop',
        'name': 'sandwich',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'selfsuck',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'sphlyrafun',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'sweetiebellesvirginmarshmallowpussy',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'twishake',
        'nsfw': True
    },
    {
        'sr': 'futemotes',
        'name': 'twna',
        'nsfw': True
    },
    {
        'sr': 'mylittlensfw',
        'name': 'vinylshake',
        'nsfw': True
    },
]

stylesheet_url_format = "http://www.reddit.com/r/{}/stylesheet"
subreddits = [
    "adviceponies",
    "ainbowdash",
    "applebloom",
    "applejack",
    "arborus",
    "beautybrass",
    "berrytubelounge",
    "clopclop",
    "cuttershy",
    "dashiemotes",
    "daylightemotes",
    "desktopponies",
    "falloutequestria",
    "flitter",
    "flutterlounge",
    "futemotes",
    "gallopfrey",
    "himntor",
    "idliketobeatree",
    "ilovedashie",
    "lyra",
    "minuette",
    "mlas1animotes",
    "mlas1emotes",
    "mlas1party",
    "mlhfis",
    "mlpdrawingschool",
    "mlplounge",
    "mlploungesteamgroup",
    "mlpvectors",
    "molestia",
    "mylittleadventuretime",
    "mylittlealicorn",
    "mylittlealcoholic",
    "mylittleandysonic1",
    "mylittleanhero23",
    "mylittleanime",
    "mylittleaprilfools",
    "mylittlebannertest",
    "mylittlecelestias",
    "mylittlechaos",
    "mylittlecirclejerk",
    "mylittlecombiners",
    "mylittleconspiracy",
    "mylittledamon",
    "mylittledaww",
    "mylittledramaticstory",
    "mylittlefalloutdiary",
    "mylittlefoodmanes",
    "mylittlefortress",
    "mylittleicons",
    "mylittlekindle",
    "mylittlelistentothis",
    "mylittlelivestream",
    "mylittlemango",
    "mylittlemilkyway",
    "mylittlemotorhead",
    "mylittlemusician",
    "mylittlenanners",
    "mylittlenopenopenope",
    "mylittlenosleep",
    "mylittlensfw",
    "mylittleonions",
    "mylittlepony",
    "mylittleserver",
    "mylittlesh",
    "mylittlesports",
    "mylittlesquidward",
    "mylittlesupportgroup",
    "mylittletacos",
    "mylittletwist",
    "mylittlewarhammer",
    "mylittlewelcomewagon",
    "mylittlewtf",
    "octavia",
    "pankakke",
    "pinkiepie",
    "ploungemafia",
    "ponyanarchism",
    "ponyloungerts",
    "roseluck",
    "rubypinch",
    "sapphirestone",
    "seriouslyluna",
    "spaceclop",
    "speedingturtle",
    "surprise",
    "tacoshy",
    "tbpimagedump",
    "tbpimagedump2",
    "thebestpony",
    "twilightsparkle",
    "vinylscratch"
]
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

for mlp_emote in [x for x in emotes if x['sr'] == 'mylittlepony']:
    for emote in [x for x in emotes if x['sr'] != 'mylittlepony']:
        for name in mlp_emote['names']:
            if name in emote['names']:
                emote['names'].remove(name)
                if len(emote['names']) == 0:
                    emotes.remove(emote)

# Check for apngs. For now we are just going to tag these and try and do some browser side canvas magic to display them
# in browsers that don't support apng.
key_func = lambda e: e['background-image']
for image_url, group in itertools.groupby(sorted(emotes, key=key_func), key_func):
    group = list(group)
    # don't check for apng if there is more than 1 emote in the group. Chances are it's a spritesheet
    if len(group) > 1:
        continue
        # php code to detect apng: if(strpos(substr($img_bytes, 0, strpos($img_bytes, 'IDAT')), 'acTL')!==false){
    req = urllib2.Request(image_url, None, headers)
    http_conn = opener.open(req)
    image_str = http_conn.read()
    http_conn.close()
    time.sleep(1)
    if 'acTL' in image_str[0:image_str.find('IDAT')]:
        for emote in group:
            emote['apng'] = True
            file_name = image_url[image_url.rfind('/') + 1:]
            folder_name = folder_regex.search(image_url).group(1)
            folder_array = ['../images', folder_name]
            if not os.path.exists('../images'):
                os.makedirs('../images')
            if not os.path.exists('/'.join(folder_array)):
                os.makedirs('/'.join(folder_array))
            folder_array.append(file_name)
            image_file = open('/'.join(folder_array), 'wb')
            image_file.write(image_str)
            image_file.close()
            url_format = 'http://backstage.berrytube.tv/marminator/images/{}/{}'
            emote['apng_url'] = url_format.format(folder_name, file_name)
            print 'saved an apng. Url: {}, names: {}, sr: {} '.format(image_url, emote['names'], emote['sr'])

emote_data_file = open('../js/berrymotes_data.js', 'wb')
emote_data_file.write("var berryemotes = {};".format(dumps(emotes)))
emote_data_file.close()

