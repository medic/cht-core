(function(undefined) {
    var Validator = function(validatorFunctions, entities) {
        this.validatorFunctions = validatorFunctions;
        this.entities = entities;
    };

    Validator.prototype.validate = function(entities, values, valueKey) {
        if (entities === null || typeof entities === 'undefined') {
            return true;
        }

        // A couple shorthands
        var ValidatorFunctions = this.validatorFunctions;
        var Entity = this.entities;

        var validationResult = true;
        var logicalOperator = 1; // 1 = AND, 2 = OR
        var negateNext = false;

        // Loop through the entities
        for (var i = 0; i < entities.length; i++) {
            var thisEntity = entities[i];
            var tempResult = true;
            var useTempResult = false;

            if (thisEntity.type == Entity.LogicalAnd) {
                logicalOperator = 1;
            } else if (thisEntity.type == Entity.LogicalOr) {
                logicalOperator = 2;
            } else if (thisEntity.type == Entity.LogicalNot) {
                negateNext = true;
            } else if (thisEntity.type == Entity.Func) {
                var funcName = thisEntity.funcName.toLowerCase(),
                    funcArgs = [];

                // Clone the function arguments so below we don't affect
                // the original arguments in the entity.
                for (var a = 0; a < thisEntity.funcArgs.length; a++) {
                    funcArgs.push(thisEntity.funcArgs[a]);
                }

                if (funcName.substr(0, 5) == 'other') {
                    funcName = funcName.substr(5); // Remove the "other" from the start

                    // Get the values array key of the "other" value
                    var otherValueKey = funcArgs.shift();
                    funcArgs.unshift(values[otherValueKey]);
                } else {
                    funcArgs.unshift(values[valueKey]);
                }

                funcArgs.unshift(values);

                if (ValidatorFunctions[funcName]) {
                    tempResult = ValidatorFunctions[funcName].apply(this, funcArgs);
                }
                useTempResult = true;
            } else if (thisEntity.type == Entity.Block) {
                tempResult = this.validate(thisEntity.sub, values, valueKey);
                useTempResult = true;
            } else if (thisEntity.type == Entity.Ternary) {
                var ternaryCondition = this.validate(thisEntity.conditions, values, valueKey);

                if (ternaryCondition) {
                    tempResult = this.validate(thisEntity.ifThen, values, valueKey);
                } else {
                    tempResult = this.validate(thisEntity.ifElse, values, valueKey);
                }

                useTempResult = true;
            }

            if (useTempResult) {
                if (negateNext) {
                    tempResult = ! tempResult;
                    negateNext = false;
                }

                if (logicalOperator == 1) {
                    validationResult = validationResult && tempResult;
                } else {
                    validationResult = validationResult || tempResult;
                }

                useTempResult = false;
            }
        }

        return validationResult;
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = {
            create: function(validatorFunctions, entities) {
                return new Validator(validatorFunctions, entities);
            }
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.validator = Validator;
    }
})();
