count=0
while [ `curl -o /dev/null -s -w "%{http_code}\n" http://localhost:4984` -ne 200 -a $count -lt 20 ]
  do count=$((count+=1))
  echo "waiting for couch to respond with 200 status code. Current count is $count" 
  sleep 1 
done