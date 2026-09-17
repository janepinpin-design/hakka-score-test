import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score"
file_path = "./48個字.wav"

text = "為着自家个康健，𠊎兩老臨暗仔有去十八尖山行路个習慣。有一擺，看着盡多人拿等攝影機翕無停，𠊎乜行過去鬥鬧熱。"
pinyin = "ui55 do31 qid2 ga24 ge55 kong24 kien55 ngai11 liong31 lo31 lim11 am55 e31 iu24 hi55 siip5 bat2 ziam24 san24 hang11 lu55 ge55 xip5 guan55 iu24 it2 bai31 kon55 do31 cin55 do24 ngin11 na24 den31 ngiap2 iang31 gi24 hip2 mo11 tin11 ngai11 me55 hang11 go55 hi55 deu55 nau55 ngiet5"

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