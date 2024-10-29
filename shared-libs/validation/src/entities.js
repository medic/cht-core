const entities = {};

const addEntity = (name) => {
  entities[name] = {
    name,
    toString: () => name
  };
};

addEntity('Block');
addEntity('Func');
addEntity('Ternary');
addEntity('LogicalAnd');
addEntity('LogicalOr');
addEntity('LogicalNot');

module.exports = entities;
