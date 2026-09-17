import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score"
file_path = "./為着自家个康健_converted.wav"

files = {
    "file": open(file_path, "rb")
}
data = {
    "text": "為着自家个康健，𠊎兩老臨暗仔有去十八尖山行路个習慣。",
    "pinyin": "ui55 zaag2 ci55 ga24 ge55 kong24 kien55 ngai11 liong31 lo31 lim11 am55 e31 iu31 hi55 siip2 bad2 ziam24 san24 hang11 lu55 ge55 xid2 guan55",
    "accent_id": "1"
}

print("開始送出請求，請稍候...")
response = requests.post(url, files=files, data=data, verify=False, timeout=120)

print("Status Code:", response.status_code)
print("Response Body:", response.text)