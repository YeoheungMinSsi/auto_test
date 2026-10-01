echo -e "\n==================== [서버 시작: $(date '+%Y-%m-%d %H:%M:%S')]====================" >> ~/logs/auto/app.log

nohup /home/min/blog/bin/python3 -u main.py >> ~/logs/auto/app.log 2>> ~/logs/auto/error.log &
echo "blog 서버가 백그라운드에서 시작합니다!"

echo -e "\n==================== [grok 구동시작: $(date '+%Y-%m-%d %H:%M:%S')]=====================" >> ~/logs/auto/ngrok.log

nohup ngrok start web --log=stdout >> ~/logs/auto/ngrok.log 2>> ~/logs/auto/ngrok_error.log &
echo "ngrok 구동시작"
echo "구동중 log를 기록합니다"
