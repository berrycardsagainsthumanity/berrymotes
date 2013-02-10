from cookielib import CookieJar
import itertools
import urllib
import tinycss
import urllib2
import re
from collections import defaultdict
from json import dumps
import time

emote_info = [
    {
        'sr': 'futemotes',
        'name': 'horsecock',
        'nsfw': True
    }
]

stylesheet_url_format = "http://www.reddit.com/r/{}/stylesheet"
subreddits = ["adviceponies",
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
              "vinylscratch"]
emotes = []

user_agent = 'User-Agent: Ponymote harvester v1.0 by /u/marminatoror'
cj = CookieJar()
opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(cj), urllib2.HTTPHandler())
formdata = {"user": "ponymoteharvester", "passwd": "berry_punch", "rem": False}
opener.open("http://www.reddit.com/api/login", urllib.urlencode(formdata))

rules_we_care_about = ['width', 'height', 'background-image', 'background-position']

for subreddit in subreddits:
    skip = False
    for i in range(0, 5):
        time.sleep(1)
        try:
            headers = {'User-Agent': user_agent}
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
    emote_regex = re.compile('a\[href\|?="/([\w]+)')

    for rule in stylesheet.rules:
        if emote_regex.match(rule.selector.as_css()):
            m = emote_regex.search(rule.selector.as_css())
            for match in emote_regex.finditer(rule.selector.as_css()):
                rules = {}
                for declaration in rule.declarations:
                    if declaration.name in rules_we_care_about:
                        if declaration.name == 'background-position':
                            val = [v.value for v in declaration.value if v.value != ' ']
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
        emotes.append(emote)

file = open('emotes.txt', 'wb')
file.write(dumps(emotes))

