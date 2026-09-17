import imageio_ffmpeg
import subprocess

ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

# 建立檔案清單，ffmpeg 用這個清單依序接續兩個音檔
with open("filelist.txt", "w", encoding="utf-8") as f:
    f.write("file '1+2.wav'\n")
    f.write("file '第3首.wav'\n")

command = [
    ffmpeg_path,
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", "filelist.txt",
    "-c", "copy",
    "三首合併.wav"
]

result = subprocess.run(command, capture_output=True, text=True)

if result.returncode == 0:
    print("合併完成！")
else:
    print("合併失敗：")
    print(result.stderr)