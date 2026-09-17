import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score"
file_path = "./三首合併.wav"

text = "想起連妹實在難，可比鯉魚上急灘；水清又驚人看著，水汶又怕網來攔。千山鳥飛絕，萬徑人蹤滅；孤舟蓑笠翁，獨釣寒江雪。客路青山外，行舟綠水前。潮平兩岸闊，風正一帆懸。海日生殘夜，江春入舊年。鄉書何處達，歸雁洛陽邊。"
pinyin = "xiong31 hi31 lien11 moi55 siid5 cai55 nan11 ko31 bi31 li24 ng11 song55 gib2 tan24 sui31 qin24 iu55 giang24 ngin11 kon55 do31 sui31 vun11 iu55 pa55 miong31 loi11 lan11 qien24 san24 diau24 bi24 qied5 van55 gang55 ngin11 jiung24 mied5 ted2 gu24 son11 so24 lib2 vung24 tug5 diau55 hon11 gong24 xied2 hag2 lu55 qiang24 san24 ngoi55 hang11 son11 liug5 sui31 qien11 ceu11 piang11 liong31 ngan55 ka55 fad2 fung24 coi24 id2 fam11 diau55 hoi31 ngid2 sen24 can11 ia55 gong24 cun24 ngib5 kiu55 ngien11 hiong24 su24 ho11 cu31 tad5 gui24 ngien55 e31 log5 iong11 bien24"

files = {
    "file": open(file_path, "rb")
}
data = {
    "text": text,
    "pinyin": pinyin,
    "accent_id": "1"
}

print("開始送出請求，請稍候...")
response = requests.post(url, files=files, data=data, verify=False, timeout=120)

print("Status Code:", response.status_code)
print("Response Body:", response.text)