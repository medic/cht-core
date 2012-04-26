# Functional JavaScript Tests

## Casper.js + Phantom.js

Problem: weird error when accessing the authdb after logging in. xhr returns with status 0.

## Tobi

Problem: it seems there is a problem loading external resources like modules.js, etc. So we cannot even login because the template isn't loaded and inserted. Not sure why this problem exists, but it is known because the unit test in tobi concerning this behavior is commented out.

## Zombie.js

Problem: the session.on('change') callback is run, but for some reason the jQuery does not put the login link on the page.
This does not work: $('#session_menu').replaceWith(el);
This works: $('#session_menu').remove(); $('.nav').append(el);
And that is because it cannot find $('#session_menu') in the code.. why not? I can see it with $(body).html().

