core.Alert("replacePassword loaded")

function replacePassword(body)
    if body then
        local result = (body):gsub("(password[^:]*:%s*\")[^\"]*", "%1***")
        return result
    end
end

core.register_converters("replacePassword", replacePassword)
