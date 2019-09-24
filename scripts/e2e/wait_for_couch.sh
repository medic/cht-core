count=0
echo `curl -o /dev/null -s -w "%{http_code}\n" http://localhost:$1`
while [ `curl -o /dev/null -s -w "%{http_code}\n" http://localhost:$1` -ne 200 -a $count -lt 20 ]
  do count=$((count+=1))
  echo "waiting for couch to respond with 200 status code. Current count is $count" 
  sleep 1 
done