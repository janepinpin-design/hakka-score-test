import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score"
file_path = "./十八.wav"

text = "十八"
pinyin = "siip5 bat2"

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