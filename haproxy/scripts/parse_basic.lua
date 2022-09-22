core.Alert("parseBasic loaded")

-- character table string
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

-- decoding
function dec(data)
    data = string.gsub(data, '[^'..b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(b:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

function parseBasic(txn)
  local hdr = txn.http:req_get_headers()
  local authorization = hdr["authorization"][0]
  local userpass_b64 = authorization:match("Basic%s+(.*)")
  if userpass_b64 then
    local userpass = dec(userpass_b64)
    local username, password = userpass:match("([^:]*):(.*)")
    return username
  end
  return '-'
end

core.register_fetches("parseBasic", parseBasic)
