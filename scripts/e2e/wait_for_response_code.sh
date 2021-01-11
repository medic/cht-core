count=0
while [ `curl -o /dev/null -s -w "%{http_code}\n" http://localhost:$1` -ne "$2" -a $count -lt 20 ]
  do count=$((count+=1))
  echo "waiting for $3 to respond with 200 status code. Current count is $count" 
  sleep 1 
done