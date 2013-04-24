This is a hack on top of the node-json-streams project by Floby
https://github.com/Floby/node-json-streams

I needed to add some Kanso JSON data-format specifics to the parser so each
document in an array is emitted separately without creating a giant object for
all of them.

Thanks to Floby for allowing me to include this code in the Kanso project!
