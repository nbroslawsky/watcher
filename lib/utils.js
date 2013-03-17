/**
 * Create a function that delays itself if called back-to-back too quickly
 *
 * @param fn {Function} The function
 * @param ms {Number} The time between each call
 * @param [ctx] {Object} The context for the resulting function
 * @returns {Function} The debounced function
 */
Function.prototype.debounce = function(ms, ctx) {
	var fn = this;
	function debounced() {
		ctx = ctx || this;
		var now = (new Date()).getTime(),
			delay = ms - now + debounced.__lastRun,
			args = arguments;
		if(delay > 0) {
			if(!debounced.__timeout) debounced.__timeout = setTimeout(function() {
				debounced.__timeout = 0;
				fn.apply(ctx, args);
			}, delay);
		}
		else {
			fn.apply(ctx, args);
		}
		debounced.__lastRun = now;
		return ctx;
	}
	debounced.cancel = function() {
		if(debounced.__timeout) clearTimeout(debounced.__timeout);
	};
	debounced.immediately = function() {
		debounced.cancel();
		return fn.apply(ctx, arguments);
	};
	return debounced;
};

Function.debounce = function(fn, ms, ctx) {
	return fn.debounce.call(fn, ms, ctx);
};

/**
 * Create a function that waits to execute until there has been a delay in calls
 *
 * @param fn {Function} The function
 * @param ms {Number} Wait for a delay at least this long
 * @param [ctx] {Object} The context for the resulting function
 * @returns {Function} The delayed function
 */
Function.prototype.delay = function(ms, ctx) {
	var fn = this;
	function delayed() {
		ctx = ctx || this;
		var args = arguments;
		delayed.cancel();
		delayed.__timeout = setTimeout(function() {
			delayed.__timeout = null;
			fn.apply(ctx, args);
		}, ms);
		return ctx;
	}
	delayed.cancel = function() {
		if(delayed.__timeout) clearTimeout(delayed.__timeout);
	};
	delayed.immediately = function() {
		delayed.cancel();
		return fn.apply(ctx, arguments);
	};
	return delayed;
};
Function.delay = function(fn, ms, ctx) {
	return fn.delay.call(fn, ms, ctx);
};