- root is the root package which includes 'subpkg', a package including a dependency
  with a preprocessor
- subpkg is a dependency of 'root' and uses prepkg which contains a preprocessor
- prepkg provides a preprocessor

The prepkg preprocessor should run against subpkg __only__
