import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import mergeWith from 'lodash.mergewith';
import isArray from 'lodash.isarray';

let debug = Debug('feathers-generator:mount');

/*
 * @Function merge - safely merges without overwrite of arrays
 * @argument source <Object> - the original object to merge to
 * @argument changes <Object> - changes to be merged
 * @returns <Object> - safely merged configuration object
 */
function merge (source, changes) {
  debug('merging', source, changes);
  function safeMerge (src, chg) {
    debug('isArray', src);
    if (isArray(src)) {
      return src.concat(chg);
    }
  }
  return mergeWith(source, changes, safeMerge);
}

export function services (options) {
  return function mount (files, metalsmith, done) {
    // if not mounting, skip
    if (!options.mount) {
      return done(null);
    }

    // @slajax refactor this into src/util/configuration so we have getter/setters for async changing of all configs
    // load existing root config
    let feathersConfigPath = path.resolve(options.mount);
    let feathersConfigDirname = path.dirname(feathersConfigPath);

    debug(`Attempting to require feathers bootstrap at ${feathersConfigPath}`);
    let existingFeathersConfig = require(feathersConfigPath);

    // add new service to root config for bootstrapping
    let serviceConfigPath = path.resolve(options.path, options.name, options.name + '.json');
    let relativeServiceConfigPath = path.relative(feathersConfigDirname, serviceConfigPath);
    let feathersConfigChanges = { use: { ['/' + options.name]: { require: './' + relativeServiceConfigPath } } };
    let newFeathersConfig = merge(existingFeathersConfig, feathersConfigChanges);

    debug(`Attempting to mount ${options.name} service to feathers at ${feathersConfigPath}`);

    // write out new root config so service is bootstrapped (respect white space)
    fs.writeFile(feathersConfigPath, JSON.stringify(newFeathersConfig, null, 2), function (err) {
      if (err) {
        debug(err.stack);
        return done(err);
      }
      debug(`Successfully mounted "${options.name}" service to feathers at ${feathersConfigPath}`);
      debug(`Service config can be found at ${relativeServiceConfigPath}`);
      done();
    });
  };
}

export function hooks (options) {
  return function mount (files, metalsmith, done) {
    // if not mounting, skip
    if (!options.mount) {
      return done(null);
    }

    const metadata = metalsmith.metadata();

    let serviceConfigPath = path.resolve(options.mount);
    let serviceConfigDirname = path.dirname(serviceConfigPath);

    let relativeServiceConfigPath = path.relative(serviceConfigDirname, serviceConfigPath);
    let existingServiceConfig = require(serviceConfigPath);
    let serviceConfigChanges = {};

    debug(`Attempting to mount ${options.name} hook to service at ${serviceConfigPath}`);

    metadata.answers.binding.map((b) => {
      debug(`Compiling changes for ${b} bindings`);

      if (typeof serviceConfigChanges[b] === 'undefined') {
        serviceConfigChanges[b] = {};
      }

      metadata.answers.method.map((m) => {
        debug(`Compiling changes for ${b} bindings and ${m} method`);

        let hook = {
          require: './hooks/' + options.name,
          options: []
        };

        if (typeof serviceConfigChanges[b][m] === 'undefined') {
          serviceConfigChanges[b][m] = [];
        }
        serviceConfigChanges[b][m].push(hook);
      });
    });

    debug('Proposed service config changes', serviceConfigChanges);
    let newServiceConfig = merge(existingServiceConfig, serviceConfigChanges);
    debug('Final service config to be written', newServiceConfig);

    // write out new root config so service is bootstrapped (respect white space)
    fs.writeFile(serviceConfigPath, JSON.stringify(newServiceConfig, null, 2), function (err) {
      if (err) {
        debug(err.stack);
        return done(err);
      }
      debug(`Successfully mounted "${options.name}" hook to service at ${serviceConfigPath}`);
      debug(`Service config can be found at ${relativeServiceConfigPath}`);
      done();
    });

    done();
  };
}

export function filter (options) {
  return function mount (files, metalsmith, done) {
    // if not mounting, skip
    if (!options.mount) {
      return done(null);
    }

     const metadata = metalsmith.metadata();

    let serviceConfigPath = path.resolve(options.mount);
    let serviceConfigDirname = path.dirname(serviceConfigPath);

    let relativeServiceConfigPath = path.relative(serviceConfigDirname, serviceConfigPath);
    let existingServiceConfig = require(serviceConfigPath);
    let serviceConfigChanges = { filters: {} };

    debug(`Attempting to mount ${options.name} hook to service at ${serviceConfigPath}`);

    metadata.answers.method.map((m) => {
      debug(`Compiling changes for ${m} method`);

      let filters = {
        require: './filters/' + options.name,
        options: []
      };

      if (typeof serviceConfigChanges['filters'][m] === 'undefined') {
        serviceConfigChanges['filters'][m] = [];
      }
      serviceConfigChanges['filters'][m].push(filters);
    });

    debug('Proposed service config changes', serviceConfigChanges);
    let newServiceConfig = merge(existingServiceConfig, serviceConfigChanges);
    debug('Final service config to be written', newServiceConfig);

    // write out new root config so service is bootstrapped (respect white space)
    fs.writeFile(serviceConfigPath, JSON.stringify(newServiceConfig, null, 2), function (err) {
      if (err) {
        debug(err.stack);
        return done(err);
      }
      debug(`Successfully mounted "${options.name}" hook to service at ${serviceConfigPath}`);
      debug(`Service config can be found at ${relativeServiceConfigPath}`);
      done();
    });

    done();
  };
}

export function middleware (options) {
  return function mount (files, metalsmith, done) {
    // if not mounting, skip
    if (!options.mount) {
      return done(null);
    }

    const metadata = metalsmith.metadata();

    let serviceConfigPath = path.resolve(options.mount);
    let serviceConfigDirname = path.dirname(serviceConfigPath);

    let relativeServiceConfigPath = path.relative(serviceConfigDirname, serviceConfigPath);
    let existingServiceConfig = require(serviceConfigPath);
    let serviceConfigChanges = {};

    // if the config starts with require. assume it's a service
    let type = (existingServiceConfig.require) ? 'service' : 'app';

    if (type === 'service') { // if it's a service mount it explicitly
      debug(`Attempting to mount ${options.name} middleware to service at ${serviceConfigPath}`);

      metadata.answers.binding.map((b) => {
        debug(`Compiling changes for ${b} bindings`);

        if (typeof serviceConfigChanges[b] === 'undefined') {
          serviceConfigChanges[b] = {};
        }

        metadata.answers.method.map((m) => {
          debug(`Compiling changes for ${b} bindings and ${m} method`);

          let relativePath = path.relative(options.mount, path.join(options.path, options.name));

          let hook = {
            require: './' + relativePath,
            options: []
          };

          if (typeof serviceConfigChanges[b][m] === 'undefined') {
            serviceConfigChanges[b][m] = [];
          }
          serviceConfigChanges[b][m].push(hook);
        });
      });
    } else { // if it's the application mount to / (wildcard)
      debug(`Attempting to mount ${options.name} middleware to app at ${serviceConfigPath}`);

      metadata.answers.binding.map((b) => {
        debug(`Compiling changes for ${b} bindings`);

        if (typeof serviceConfigChanges[b] === 'undefined') {
          serviceConfigChanges[b] = {};
        }

        let dir = path.dirname(options.path);
        let writePath = path.join(options.path, options.name);
        let relativePath = path.relative(dir, writePath);

        let hook = {
          require: './' + relativePath,
          options: []
        };

        if (typeof serviceConfigChanges[b]['/'] === 'undefined') {
          serviceConfigChanges[b]['/'] = [];
        }
        serviceConfigChanges[b]['/'].push(hook);
      });
    }

    debug('Proposed service config changes', serviceConfigChanges);
    let newServiceConfig = merge(existingServiceConfig, serviceConfigChanges);
    debug('Final service config to be written', newServiceConfig);

    // write out new root config so service is bootstrapped (respect white space)
    fs.writeFile(serviceConfigPath, JSON.stringify(newServiceConfig, null, 2), function (err) {
      if (err) {
        debug(err.stack);
        return done(err);
      }
      debug(`Successfully mounted "${options.name}" middleware to service at ${serviceConfigPath}`);
      debug(`Service config can be found at ${relativeServiceConfigPath}`);
      done();
    });

    done();
  };
}

export function plugin (options) {
  return function mount (files, metalsmith, done) {
    // if not mounting, skip
    if (!options.mount) {
      return done(null);
    }

    // const metadata = metalsmith.metadata();

    let serviceConfigPath = path.resolve(options.mount);
    let serviceConfigDirname = path.dirname(serviceConfigPath);

    let relativeServiceConfigPath = path.relative(serviceConfigDirname, serviceConfigPath);
    let existingServiceConfig = require(serviceConfigPath);
    let serviceConfigChanges = { plugins: [] };

    debug(`Attempting to mount ${options.name} plugin to app at ${serviceConfigPath}`);

    debug(`Compiling changes for plugin bindings`);

    let hook = {
      require: path.resolve(options.root, options.path, options.name),
      options: []
    };

    serviceConfigChanges.plugins.push(hook);

    debug('Proposed service config changes', serviceConfigChanges);
    let newServiceConfig = merge(existingServiceConfig, serviceConfigChanges);
    debug('Final service config to be written', newServiceConfig);

    // write out new root config so service is bootstrapped (respect white space)
    fs.writeFile(serviceConfigPath, JSON.stringify(newServiceConfig, null, 2), function (err) {
      if (err) {
        debug(err.stack);
        return done(err);
      }
      debug(`Successfully mounted "${options.name}" middleware to service at ${serviceConfigPath}`);
      debug(`Service config can be found at ${relativeServiceConfigPath}`);
      done();
    });

    done();
  };
}

