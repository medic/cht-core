core.Alert("parseCookie loaded")

local hex_to_char = function(x)
  return string.char(tonumber(x, 16))
end

local unescape = function(url)
  return url:gsub("%%(%x%x)", hex_to_char)
end

local user = function(cookie)
  return string.match(unescape(cookie), "userCtx={\"name\":\"(.-)\",\"roles\":")
end

function parseCookie(txn)
  local hdr = txn.http:req_get_headers()
  return user(hdr["cookie"][0])
end

core.register_fetches("parseCookie", parseCookie)
