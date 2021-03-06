// Global utility function for loading JS modules during a Jasmine spec
var require = function(toLoad, libs) {
	libs = libs ? libs : {};
	for (var lib in libs) { delete libs[lib]; }
	var list = [];
	if (toLoad instanceof Array) {
		var map = {};
		for (var l in toLoad)
			map[toLoad[l]] = null;
	}
	else {
		var map = toLoad;
	}
	for (var lib in map) { list.push(lib); }
	curl({ baseUrl: openhmis.url.resources }, list, function(something, somethinelse) {
		libList = {};
		for (var lib in arguments) {
			libs[map[list[lib]]] = arguments[lib];
		}
	});
	waitsFor(function() {
		for (var item in map) {
			if (libs[map[item]] !== undefined) continue;
			else return false;
		}
		return true;
	}, "required resources to load", 1000);
};

openhmis.test = {};
/**
 * Compare the JSON generated by a model to reference data
 *
 * @param {Object} model Model or array of attributes to test
 * @param {Object} reference Object against which to test model
 * @param {function} expectFunc Reference to Jasmine expect()
 * @param {Object} schema (Optional) If model is an array, the appropriate
 *     model schema should be provided
 */
openhmis.test.modelToJson = function(model, reference, expectFunc, schema) {
	/**
	 * Recursive comparison function.
	 *
	 * @param {Object} obj Object to test
	 * @param {Object} reference Object against which to test obj
	 * @param {Object} schemaLevel Reference to the current level to find
	 *     schema information for obj
	 * @param {boolean} objRef Whether obj is supposed to be serialized as a
	 *     object reference, i.e. UUID string
	 */
	var testObj = function(obj, reference, schemaLevel, objRef) {
		for (var attr in obj) {
			if (obj[attr] instanceof Array) {
				testObj(
					obj[attr],
					reference[attr],
					schemaLevel[attr],
					schemaLevel[attr] ? schemaLevel[attr].objRef : undefined
				);
			}
			else if (typeof obj[attr] === "object") {
				var parentIsArray = (obj instanceof Array);
				var nextSchema;
				// If the current object is an array then we won't find a schema
				// in schemaLevel[attr]
				if (parentIsArray) {
					// If the array is a list of models, we can find the model's
					// schema
					if (schemaLevel.itemType == "NestedModel" && schemaLevel.model)
						nextSchema = schemaLevel.model.prototype.schema;
					// Default to the array's (parent's) schema
					else
						nextSchema = schemaLevel;
				}
				else
					nextSchema = schemaLevel[attr];
				testObj(
					obj[attr].toJSON ? obj[attr].toJSON() : obj[attr],
					reference[attr],
					nextSchema,
					nextSchema.objRef
				);
			}
			else {
				if 	(objRef
						|| (schemaLevel.itemType == "NestedModel"
							&& schemaLevel.model
							&& schemaLevel.model.prototype.schema[attr]
							&& schemaLevel.model.prototype.schema[attr].objRef)
						|| (schemaLevel[attr] && schemaLevel[attr].objRef)) {
					var refId = reference[attr].uuid ? reference[attr].uuid : reference[attr];
					expectFunc(obj[attr]).toEqual(refId);
				}
				else
					expectFunc(obj[attr]).toEqual(reference[attr]);
			}
		}
	}
	schema = model.schema || schema;
	testObj(model.toJSON ? model.toJSON() : model, reference, schema);
}