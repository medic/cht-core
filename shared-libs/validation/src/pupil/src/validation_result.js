(function(undefined) {
	var ValidationResult = function(results) {
		this.results = results;
	};

	ValidationResult.prototype.isValid = function() {
		for (var index in this.results) {
			if ( ! this.results[index]) {
				return false;
			}
		}

		return true;
	};

	ValidationResult.prototype.hasErrors = function() {
		return ! this.isValid();
	};

	ValidationResult.prototype.errors = function() {
		var errors = [];

		for (var index in this.results) {
			if ( ! this.results[index]) {
				errors.push(index);
			}
		}

		return errors;
	};

	ValidationResult.prototype.fields = function() {
		return this.results;
	};

	// Export the module
	var exportedModule = {
		create: function(results) {
            return new ValidationResult(results);
        }
	};

    if (typeof module !== 'undefined') {
        module.exports = exportedModule;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.validation_result = exportedModule;
    }
})();