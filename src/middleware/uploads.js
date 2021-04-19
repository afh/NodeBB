'use strict';

const LRU = require('lru-cache');
const meta = require('../meta');
const helpers = require('./helpers');
const user = require('../user');

console.log('----cooldown', meta.config.uploadRateLimitCooldown * 1000, new Error('a').stack);
const cache = new LRU({
	maxAge: meta.config.uploadRateLimitCooldown * 1000,
});

exports.clearCache = function () {
	cache.reset();
};

exports.ratelimit = helpers.try(async (req, res, next) => {
	const { uid } = req;
	if (!meta.config.uploadRateLimitThreshold || (uid && await user.isAdminOrGlobalMod(uid))) {
		return next();
	}

	const count = (cache.peek(`${req.ip}:uploaded_file_count`) || 0) + req.files.files.length;
	console.log('req.ip', req.ip, count, req.files.files.length, meta.config.uploadRateLimitThreshold);
	if (count > meta.config.uploadRateLimitThreshold) {
		return next(new Error(['[[error:upload-ratelimit-reached]]']));
	}

	cache.set(`${req.ip}:uploaded_file_count`, count);
	next();
});

