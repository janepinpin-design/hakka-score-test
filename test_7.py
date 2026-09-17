import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score"
file_path = "./為着自家个康健_converted.wav"

text = "為着自家个康健"
pinyin = "ui55 do31 qid2 ga24 ge55 kong24 kien55"

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