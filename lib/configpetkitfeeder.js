'use strict';

class configPetkitFeeder {
    constructor(config, defaults) {
        this.config = configPetkitFeeder.validateConfig(config, defaults);      
    };
    
    static validateConfig(conf, defaults) {
        let config = conf;
        let headers = config.headers;
        if (!headers) {
            throw 'missing dataset: headers in your config.';
            return undefined;
        }

        if (headers.find(header => header.key === 'X-Session') === undefined) {
            throw 'missing header in your headers: X-Session(note: case sensitive).';
            return undefined;
        }
        
        for (const [key, value] of Object.entries(defaults.headers)) {
            if (!headers.find(header => header.key == key)) {
                headers.push({'key': key, 'value': value})
            }
        }

        let http_headers = {};
        headers.forEach(header => {
            http_headers[header.key] = header.value;
        });
        config.headers = http_headers;

        const model = config.model;
        if (!model) {
            throw 'missing dataset: model in your config.';
            return undefined;
        } else {
            const validModels = defaults.models;
            if (!configPetkitFeeder.checkValueValid(model, validModels)) {
                throw 'value of model(' + model + ') should be one of ' + JSON.stringify(validModels);
                return undefined;
            }
        }

        const location = config.location;
        if (!location) {
            throw 'missing dataset: location in your config.';
            return undefined;
        } else {
            const validLocations = Object.keys(defaults.hosts);
            if (!configPetkitFeeder.checkValueValid(location, validLocations)) {
                throw 'value of location(' + location + ') should be one of ' + JSON.stringify(validLocations);
                return undefined;
            }
        }
        
        config.host = defaults.hosts[location];
   
        config.urls = defaults.urls[model];
        
        config.http_options = defaults.http_options;
        config.http_options = Object.assign(config.http_options, {
            'retry': {
                'enabled': config.enable_http_retry,
                'max_retry': config.http_retry_count
            }
        });
        
        config.settings = defaults.settings[model];

        config.manufacturer = 'Petkit';

        const polling_interval = config.polling_interval;
        const min_polling_interval = defaults.config.min_pollint_interval;
        const max_polling_interval = defaults.config.max_pollint_interval;
        if (!configPetkitFeeder.checkValueRange(polling_interval, min_polling_interval, max_polling_interval)) {
            //this.log.warn(format('value of polling_interval({0}) should between {1} and {2}, now using {2} instead', polling_interval, min_polling_interval, max_polling_interval));
            config.polling_interval = max_polling_interval;
        }

        const alert_desiccant_threshold = config.alert_desiccant_threshold;
        const min_desiccantLeftDays = defaults.config.min_desiccantLeftDays;
        const max_desiccantLeftDays = defaults.config.max_desiccantLeftDays;
        if (!configPetkitFeeder.checkValueRange(alert_desiccant_threshold, min_desiccantLeftDays, max_desiccantLeftDays)) {
            //this.log.warn(format('value of alert_desiccant_threshold({0}) should between {1} and {2}, now using {2} instead', alert_desiccant_threshold, min_desiccantLeftDays, max_desiccantLeftDays));
            config.alert_desiccant_threshold = max_desiccantLeftDays;
        }

        const reset_desiccant_threshold = config.reset_desiccant_threshold;
        if (!configPetkitFeeder.checkValueRange(reset_desiccant_threshold, min_desiccantLeftDays, config.alert_desiccant_threshold)) {
            //this.log.warn(format('value of reset_desiccant_threshold({0}) should between {1} and {2}, now using {2} instead', reset_desiccant_threshold, min_desiccantLeftDays, config.get('alert_desiccant_threshold')));
            config.reset_desiccant_threshold = config.alert_desiccant_threshold;
        }
        
        const meal_amount = config.meal_amount;
        const min_amount = defaults.config.min_amount;
        const max_amount = defaults.config.max_amount;
        if (!configPetkitFeeder.checkValueRange(meal_amount, min_amount, max_amount)) {
            //this.log.warn(format('value of polling_interval({0}) should between {1} and {2}, now using {2} instead', polling_interval, min_polling_interval, max_polling_interval));
            config.meal_amount = max_amount;
        }
      
        config.enabled_daily_feeds = ((config.enabled_daily_feeds) ? 1 : 0);
        config.feed_daily_list = configPetkitFeeder.fulfillFeedList(config.feed_daily_list);
   
        config.DropMeal_name = configPetkitFeeder.fulfill(config.DropMeal_name, 'DropMeal');
        config.FoodStorage_name = configPetkitFeeder.fulfill(config.FoodStorage_name, ((config.reverse_foodStorage_indicator) ? 'FoodStorage_Empty' : 'FoodStorage'));
        config.FeedDaily_name = configPetkitFeeder.fulfill(config.FeedDaily_name, 'FeedDaily');
        config.DesiccantLevel_name = configPetkitFeeder.fulfill(config.DesiccantLevel_name, 'DesiccantLevel');
        config.ManualLock_name = configPetkitFeeder.fulfill(config.ManualLock_name, 'ManualLock');
        config.LightMode_name = configPetkitFeeder.fulfill(config.LightMode_name, 'LightMode');
        config.Battery_name = configPetkitFeeder.fulfill(config.Battery_name, 'Battery');
        config.BlockDoor_name = configPetkitFeeder.fulfill(config.BlockDoor_name, 'BlockDoor');
        
        return config;
    };

    static checkValueValid(value, array) {
        return (-1 !== array.indexOf(value));
    };

    static checkValueRange(value, min, max) {
        return (value >= min && value <= max);
    };

    static fulfill(original_value, default_value) {
        return (original_value ? original_value : default_value);
    };
    
    static fulfillFeedList(array) {
        let feedList = [];
            array.forEach(meal => {
                feedList.push({
                    'name' : (!meal.name ? meal.time : meal.name),
                    'amount' : meal.amount * 5,
                    'time' : meal.time,
                    'id' : meal.time
                });
            });
        return feedList;
    };
    
    set(prop, value) {
        this.config[prop] = value;
    };
    
    get(prop) {
        return this.config[prop];
    };
    
    assign(prop, value) {
        this.config[prop] = Object.assign(this.config[prop], value);
    };
};

module.exports = configPetkitFeeder;
