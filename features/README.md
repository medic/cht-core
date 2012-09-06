# Functional JavaScript Tests

Current choice: Vows-bdd + Zombie.js


## Casper.js + Phantom.js

Problem: weird error when accessing the authdb after logging in. xhr returns with status 0.

## Tobi

Problem: it seems there is a problem loading external resources like modules.js, etc. So we cannot even login because the template isn't loaded and inserted. Not sure why this problem exists, but it is known because the unit test in tobi concerning this behavior is commented out.

## Zombie.js

Have to delete the DB for every scenario, otherwise there's a strange error where the status of the XHR is 0 and so session.info does not work. When deleting the DB the problem is that the browser is still trying to access the changes feed and so shows an unnecessary error. Not sure how to solve that yet.