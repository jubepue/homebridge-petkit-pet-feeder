'use strict';

let PlatformAccessory, Accessory, Service, Characteristic, UUIDGen;

const format = require('string-format');
const axios = require('axios');
const dayjs = require('dayjs');
const pollingtoevent = require('polling-to-event');

const logs = require('./lib/log');
const configPetkitFeeder = require('./lib/configpetkitfeeder');
const petkitFeederDevice = require('./lib/petkitfeeder');

const pluginName = 'homebridge-feeder';
const platformName = 'petkit_feeder';

const defaults = Object.freeze({
    'models': [                
        'Feeder',                    
        'FeederMini',                   
        'D4',                             
        'D3',                               
    ],
    'settings': {
        'Feeder': {
            'manualLock' : 'settings.manualLock',
            'lightMode' : 'settings.lightMode',
            'lightRange' : 'settings.lightRange',
            'foodWarn': 'settings.foodWarn',
            'foodWarnRange': 'settings.foodWarnRange'
        },
        'FeederMini': {
            'manualLock' : 'settings.manualLock',
            'lightMode' : 'settings.lightMode',
            'lightRange' : 'settings.lightRange',
            'foodWarn': 'settings.foodWarn',
            'foodWarnRange': 'settings.foodWarnRange'
        },
        'D4': {
            'manualLock' : 'manualLock',
            'lightMode' : 'lightMode',
            'lightRange' : 'lightRange',
            'foodWarn': 'foodWarn',  // {"foodWarn":1}
            'foodWarnRange': 'foodWarnRange' // {"foodWarnRange":[480,1200]}
        },
        'D3': {
            'manualLock' : 'manualLock',
            'lightMode' : 'lightMode',
            'lightRange' : 'lightRange',
            'foodWarn': 'foodWarn',
            'foodWarnRange': 'foodWarnRange'
        },
    },
    'headers': {
        'X-Client': 'ios(15.5;iPhone12,3)',
        'Accept': '*/*',
        'X-Timezone': '2.0',
        'Accept-Language': 'es-ES;q=1',
        'Accept-Encoding': 'gzip, deflate',
        'X-Api-Version': '8.17.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PETKIT/8.17.1 (iPhone; iOS 15.5; Scale/3.00)',
        'X-TimezoneId': 'Europe/Madrid',
        'X-Locale': 'es_ES'
    },
    'http_options': {
        'method': 'POST',
        'timeout': 5000,
        'responseType': 'json',
        'retry' : {
            'enabled': false,
            'max_retry': 1               
        },
    },
    'hosts': {
        'cn': 'http://api.petkit.cn/6',
        'asia': 'http://api.petktasia.com/latest',
        'international': 'http://api.petkt.com/latest'
    },
    'urls': {
        'Feeder': {
            'owndevices': '/discovery/device_roster',
            'deviceState': '/devicestate?id={}',
            'deviceDetailInfo': '/device_detail?id={}',
            'saveDailyFeed': '/save_dailyfeed?deviceId={}&day={}&time={}&amount={}',
            'removeDailyFeed': '/remove_dailyfeed?deviceId={}&day={}&id=d{}',
            'saveFeed': '/save_feed?deviceId={}&feedDailyList={}',
            'dailyfeeds': '/dailyfeeds?deviceId={}&days={}',
            'restoreDailyFeeds': '/restore_dailyfeed?deviceId={}&day={}&id=s{}',
            'disableDailyFeeds': '/remove_dailyfeed?deviceId={}&day={}&id=s{}',
            'resetDesiccant': '/desiccant_reset?deviceId={}',
            'updateSettings': '/update?id={}&kv={}'
        },
        'FeederMini': {
            'owndevices': '/discovery/device_roster',
            'deviceState': '/devicestate?id={}',
            'deviceDetailInfo': '/device_detail?id={}',
            'saveDailyFeed': '/save_dailyfeed?deviceId={}&day={}&time={}&amount={}',
            'removeDailyFeed': '/remove_dailyfeed?deviceId={}&day={}&id=d{}',
            'saveFeed': '/save_feed?deviceId={}&feedDailyList={}',
            'dailyFeeds': '/dailyfeeds?deviceId={}&days={}',
            'restoreDailyFeeds': '/restore_dailyfeed?deviceId={}&day={}&id=s{}',
            'disableDailyFeeds': '/remove_dailyfeed?deviceId={}&day={}&id=s{}',
            'resetDesiccant': '/desiccant_reset?deviceId={}',
            'updateSettings': '/update?id={}&kv={}'
        },
        'D4': {
            'owndevices': '/discovery/device_roster',
            'deviceState': '/devicestate?id={}',
            'deviceDetailInfo': '/device_detail?id={}',
            'saveDailyFeed': '/saveDailyFeed?deviceId={}&day={}&time={}&amount={}',
            'removeDailyFeed': '/removeDailyFeed?deviceId={}&day={}&id=d{}',
            'saveFeed': '/saveFeed?deviceId={}&feedDailyList={}',
            'dailyFeeds': '/dailyFeeds?deviceId={}&days={}',
            'restoreDailyFeeds': '/restoreDailyFeed?deviceId={}&day={}&id=s{}',
            'disableDailyFeeds': '/removeDailyFeed?deviceId={}&day={}&id=s{}',
            'resetDesiccant': '/desiccantReset?deviceId={}',
            'updateSettings': '/updateSettings?id={}&kv={}'
        },
        'D3': {
            'owndevices': '/discovery/device_roster',
            'deviceState': '/devicestate?id={}',
            'deviceDetailInfo': '/device_detail?id={}',
            'saveDailyFeed': '/saveDailyFeed?deviceId={}&day={}&time={}&amount={}',
            'removeDailyFeed': '/removeDailyFeed?deviceId={}&day={}&id=d{}',
            'saveFeed': '/saveFeed?deviceId={}&feedDailyList={}',
            'dailyfeeds': '/dailyFeeds?deviceId={}&days={}',
            'restoreDailyFeeds': '/restoreDailyFeed?deviceId={}&day={}&id=s{}',
            'disableDailyFeeds': '/removeDailyFeed?deviceId={}&day={}&id=s{}',
            'resetDesiccant': '/desiccantReset?deviceId={}',
            'updateSettings': '/updateSettings?id={}&kv={}'
        },
    },
    'config': {
        'min_amount': 0,                    
        'max_amount': 10,                   
        'min_desiccantLeftDays': 0,         
        'max_desiccantLeftDays': 30,        
        'min_batteryLevel': 0,              
        'max_batteryLevel': 4,              
        'batteryPersentPerLevel': 100 / 4,
        'min_pollint_interval': 60,         
        'max_pollint_interval': 3600,       
        'min_fetch_status_interval': 10,   
        'foodStorage_alerm_threshold': 300
    }
});

module.exports = function (homebridge) {
    PlatformAccessory = homebridge.platformAccessory;
    Accessory = homebridge.hap.Accessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform(pluginName, platformName, petkit_pet_feeder_plugin, true);
};

function getTimestamp() {
    return Math.floor(Date.now() / 1000);
};

function getDataString() {
    return dayjs(new Date()).format('YYYYMMDD');
};

class petkit_pet_feeder_plugin {
    constructor(log, config, api) {
        this.log = new logs(log, config.log_level || logs.LOGLV_INFO);
        this.log.info('Begin to initialize Petkit feeder platform.');

        if (!api) {
            this.log.error("Upgrade Homebridge's version!");
            return;
        };
        this.api = api;
        this.accessories = [];

        if (!config || !config.devices) {
            this.log.error("No configuration found.");
            return;
        } else {
            this.api.on('didFinishLaunching', () => {
                config.devices.forEach(device => {
                    try {
                        const config = new configPetkitFeeder(device, defaults);
                        this.log.debug(JSON.stringify(config.config));
                        this.initializeAccessory(config);
                    } catch(error) {
                        this.log.error(error);
                    };
                });
            });
            this.log.info('Petkit feeder platform loaded.');
        };
    };
  
    globalUrls(config, prop) {
        const host = config.get('host');
        const model = config.get('model').toLowerCase();
        let url = undefined;
        if (prop === 'owndevices') {
            url = host + config.get('urls')[prop];
        } else {
            url = host + '/' + model + config.get('urls')[prop];
        };
        return url;
    };
    
    async http_request(options) {
        this.log.debug(options.url);
        const request_once = async options => {
            return new Promise(resolve => {
                let result = undefined;
                axios.request(options)
                    .then(response => {
                        if (response.status != 200) {
                            result = {'error' : 'http request received a invalid response code: ' + response.status};
                        } else {
                            this.log.debug('http request success');
                            result = {'data' : response.data};
                        };
                    })
                    .catch(error => {
                        result = {'error' : 'http request failed: ' + error};
                    })
                    .then(() => {
                        resolve(result);
                    });
            });
        };

        let result = undefined;
        result = await request_once(options);

        if (result.error &&
            options.retry.enabled &&
            options.timeout > 0) {
            const max_retry = options.retry.max_retry;
            for (let retry = 2; retry <= max_retry; retry++) {
                result = await request_once(options);
                if (result.error) {
                    this.log.warn(result.error);
                    this.log.warn(format('retry http request: {}/{}', retry, max_retry));
                } else break;
            };
        };

        if (result.error) {
            this.log.error(format('http request failed: ' + result.error));
        };

        return result.data;
    };
    
    async http_getOwnDevice(config) {
        const url = this.globalUrls(config, 'owndevices');    
        const options = Object.assign(config.get('http_options'), {
            'url': url,
            'headers': config.get('headers')
        });
        return await this.http_request(options);
    };
    
    praseGetOwnedDevice(jsonObj) {
        if (!jsonObj) {
            this.log.error('praseGetOwnedDevice error: jsonObj is nothing.');
            return false;
        };
        const jsonStr = JSON.stringify(jsonObj);
        this.log.debug(jsonStr);

        if (jsonObj.hasOwnProperty('error')) {
            this.log.error('server reply an error: ' + jsonStr);
            this.log.error('you may need to check your X-Session and other header configure');
            return false;
        };

        if (!jsonObj.hasOwnProperty('result')) {
            this.log.error('JSON.parse error with:' + jsonStr);
            return false;
        };

        if (!jsonObj.result.hasOwnProperty('devices')) {
            this.log.error('JSON.parse error with:' + jsonStr);
            return false;
        };

        if (jsonObj.result.devices.length === 0) {
            this.log.error('seems you didn\'t owned a Petkit Feeder device.');
            return false;
        };

        var valid_devices = [];
        jsonObj.result.devices.forEach(device => {
            const index = defaults.models.indexOf(device.type);
            if (index !== -1 && device.data) {
                valid_devices.push(Object.assign(device.data, { 'type': device.type }));
            };
        });
        return valid_devices;
    };
    
    async http_saveDailyFeed(petkitDevice, amount, time) {
        const date = getDataString();
        const deviceId = petkitDevice.config.get('deviceId');
        const url_template = this.globalUrls(petkitDevice.config, 'saveDailyFeed');
        const url = format(url_template, deviceId, date, time, amount * 5);
        const options = Object.assign(petkitDevice.config.get('http_options'), {
            'url': url,
            'headers': petkitDevice.config.get('headers')
        });     
        return await this.http_request(options);
    };
    
    praseSaveDailyFeedResult(jsonObj) {
        if (!jsonObj) {
            this.log.error('praseSaveDailyFeedResult error: jsonObj is nothing.');
            return false;
        };
        const jsonStr = JSON.stringify(jsonObj);
        this.log.debug(jsonStr);

        if (jsonObj.hasOwnProperty('error')) {
            this.log.error('server reply an error: ' + jsonStr);
            this.log.error('you may need to check your X-Session and other header configure');
            return false;
        };

        if (!jsonObj.hasOwnProperty('result')) {
            this.log.error('JSON.parse error with:' + jsonStr);
            return false;
        };

        return (jsonObj.result.isExecuted === 1);
    };
    
    async http_getDeviceInfo(petkitDevice) {
        const deviceId = petkitDevice.config.get('deviceId');
        const url_template = this.globalUrls(petkitDevice.config, 'deviceDetailInfo');
        const url = format(url_template, deviceId);
        const options = Object.assign(petkitDevice.config.get('http_options'), {
            'url': url,
            'headers': petkitDevice.config.get('headers')
        });
        return await this.http_request(options);
    };
   
    getParent(obj, key) {
        let parent =[];
        for (let i in obj) {
            if (i == key) {
                parent.push(i)
                break;
            } else {
                if (typeof obj[i] == 'object') {
                    const promise = this.getParent(obj[i], key);   
                    if (promise.length != 0) {
                        if (!Array.isArray(obj)) parent.push(i);
                        parent.push(...promise);
                        break;
                    };
                };
            };
        };
        return parent;
    };
    
    getFeedDailyList(obj, key) {
        let parent = this.getParent(obj, key);
        const length = parent.length;
        parent.length = length - 1;
        let meals = obj;
        for (let i in parent) {
            meals = meals[parent[i]];
        };
        return meals;
    };
    
    praseGetDeviceDetailInfo(jsonObj) {
        if (!jsonObj) {
            this.log.error('praseGetDeviceDetailInfo error: jsonObj is nothing.');
            return false;
        };
        const jsonStr = JSON.stringify(jsonObj);
        this.log.debug(jsonStr);

        if (jsonObj.hasOwnProperty('error')) {
            this.log.error('server reply an error: ' + jsonStr);
            this.log.error('you may need to check your X-Session and other header configure');
            return false;
        };

        if (!jsonObj.hasOwnProperty('result') ||
            !jsonObj.result.hasOwnProperty('state') ||
            !jsonObj.result.hasOwnProperty('settings')) {
            this.log.error('unable to parse device info reply from server with data: ' + jsonStr);
            return false;
        };

        const deviceInfo = jsonObj.result;

        let deviceDetailInfo = {};
        if (deviceInfo.name) deviceDetailInfo.name = deviceInfo.name;
        if (deviceInfo.sn) deviceDetailInfo.sn = deviceInfo.sn;
        if (deviceInfo.firmware) deviceDetailInfo.firmware = deviceInfo.firmware;
        if (deviceInfo.timezone) deviceDetailInfo.timezone = deviceInfo.timezone;
        if (deviceInfo.locale) deviceDetailInfo.locale = deviceInfo.locale;

        deviceDetailInfo.status = {};
        // 1 for status ok, 0 for empty
        if (deviceInfo.state.food !== undefined) deviceDetailInfo.status.food = deviceInfo.state.food;
        // this.log.debug('device food storage status is: ' + (deviceDetailInfo.status.food ? 'Ok' : 'Empty'));

        if (deviceInfo.state.batteryPower !== undefined) deviceDetailInfo.status.batteryPower = deviceInfo.state.batteryPower;
        // this.log.debug('device battery level is: ' + deviceDetailInfo.status.batteryPower * globalVariables.config.batteryPersentPerLevel);

        // 0 for charging mode, 1 for battery mode
        if (deviceInfo.state.batteryStatus !== undefined) deviceDetailInfo.status.batteryStatus = deviceInfo.state.batteryStatus;
        // this.log.debug('device battery status is: ' + (deviceDetailInfo.status.batteryStatus ? 'charging mode' : 'battery mode'));

        if (deviceInfo.state.desiccantLeftDays !== undefined) deviceDetailInfo.status.desiccantLeftDays = deviceInfo.state.desiccantLeftDays;
        // this.log.debug('device desiccant remain: ' + (deviceDetailInfo.status.desiccantLeftDays + ' day(s)'));
        
        if (deviceInfo.state.errorCode !== undefined) deviceDetailInfo.status.errorCode = deviceInfo.state.errorCode;
        if (deviceInfo.state.errorDetail !== undefined) deviceDetailInfo.status.errorDetail = deviceInfo.state.errorDetail;
        
        // 0 for unlocked, 1 for locked
        if (deviceInfo.settings.manualLock !== undefined) deviceDetailInfo.status.manualLock = deviceInfo.settings.manualLock;
        // this.log.debug('device manual lock status is: ' + (deviceDetailInfo.status.manualLock ? 'unlocked' : 'locked'));

        // 0 for light off, 1 for lignt on
        if (deviceInfo.settings.lightMode !== undefined) deviceDetailInfo.status.lightMode = deviceInfo.settings.lightMode;
        // this.log.debug('device light status is: ' + (deviceDetailInfo.status.lightMode ? 'on' : 'off'));
           
        deviceDetailInfo.feedDailyList ={}
        deviceDetailInfo.feedDailyList.meals = this.getFeedDailyList(deviceInfo, 'items');
        
        return deviceDetailInfo;
    };
    
    async http_getDeviceDetailStatus(petkitDevice, callback) {
        let deviceDetailInfo = undefined;
        this.http_getDeviceInfo(petkitDevice)
        .then(device_detail_raw => {
            deviceDetailInfo = this.praseGetDeviceDetailInfo(device_detail_raw);
        })
        .catch(error => {
            this.log.error(format('unable to get device({}) status: {}', petkitDevice.config.get('deviceId'), error));
        })
        .then(() => {
            if (deviceDetailInfo) {
                petkitDevice.status = Object.assign({}, deviceDetailInfo.status);
                petkitDevice.status.lastUpdate = getTimestamp();
                petkitDevice.feedDailyList.meals = deviceDetailInfo.feedDailyList.meals;
            };
            if (callback) callback(deviceDetailInfo);
        });
    }
    
    async http_saveFeedDailyList(petkitDevice, feedDailyList) {
        const deviceId = petkitDevice.config.get('deviceId');
        const url_template = this.globalUrls(petkitDevice.config, 'saveFeed');
        const url = format(url_template, deviceId, JSON.stringify(feedDailyList));
        const options = Object.assign(petkitDevice.config.get('http_options'), {
            'url': url,
            'headers': petkitDevice.config.get('headers')
        });     
        return await this.http_request(options);
    };
    
    fulfillItemFeedList(obj) {
        let item = [];
        for (let i in obj) {
            const meal = {
                "amount": obj[i].amount,
                "id": obj[i].id,
                "name": obj[i].name,
                "time": obj[i].time
            };
            item.push(meal);
        };
        
        return item;
    };
    
    getItemFeedList(petkitDevice, day) {
        let item = undefined;
        if (!Array.isArray(petkitDevice.feedDailyList.meals)) {
            item = this.fulfillItemFeedList(petkitDevice.feedDailyList.meals.items);
        } else {
            item = this.fulfillItemFeedList(petkitDevice.feedDailyList.meals[day - 1].items);          
        };
        return item;
    };
    
    hb_feedDailyList_set(petkitDevice, value, callback) {
        const fast_response = petkitDevice.config.get('fast_response');
        if (fast_response) callback(null);
        let feedDailyList = [];
        
        if (petkitDevice.config.get('overwrite_daily_feeds')) {
            for (let day = 1; day <= 7; day++) {
                feedDailyList.push({
                    'items': petkitDevice.config.get('feed_daily_list'),
                    'repeats': day,
                    'suspended': (value ? 0 : 1)
                });
            };
        } else {
            for (let day = 1; day <= 7; day++) {
                feedDailyList.push({
                    'items': this.getItemFeedList(petkitDevice, day),
                    'repeats': day,
                    'suspended': (value ? 0 : 1)
                });
            };
        };
        this.http_saveFeedDailyList(petkitDevice, feedDailyList)
            .then(feedDailyList_raw => {
                if (feedDailyList_raw && feedDailyList_raw.result) {   
                    petkitDevice.feedDailyList.enabled = value;
                    this.log.info(format('set feed daily list to {}: success', (value ? 'enabled' : 'suspended')));
                } else {
                    this.log.warn('feed daily list with a unrecognizable reply.');
                };
            })
            .catch(error => {
                this.log.error('set feed daily list failed: ' + error);
            })
            .then(() => {
                if (!fast_response) callback(null);
                setTimeout(() => {
                    this.http_getDeviceDetailStatus(petkitDevice, deviceDetailInfo => {
                        this.uploadStatusToHomebridge(petkitDevice);
                    });
                }, 1000);
            });
    }
    
    uploadStatusToHomebridge(petkitDevice) {
        let service = undefined;
        let service_status = undefined;

        this.log.debug(JSON.stringify(petkitDevice.status));
        
        // meal drop service
        service = petkitDevice.services.drop_meal_service;
        service.getCharacteristic(Characteristic.On).updateValue(0);
       
        // feed daily service
        service = petkitDevice.services.feed_daily_service;
        service.getCharacteristic(Characteristic.On).updateValue(petkitDevice.feedDailyList.enabled);

        // battery service only for Petkit Feeder with battery
        if (petkitDevice.status.batteryStatus !== undefined) {
            service = petkitDevice.services.battery_status_service;
            // battery level
            service_status = petkitDevice.status.batteryPower * defaults.config.batteryPersentPerLevel;
            this.log.info(format('battery level is {}%.', service_status));
            service.getCharacteristic(Characteristic.BatteryLevel)
                .updateValue(service_status);
            
            // charging state
            service_status = (petkitDevice.status.batteryStatus === 0 ? 1 : 0);
            this.log.info(format('battery is {}.', service_status ? 'charging' : 'not charging'));
            service.getCharacteristic(Characteristic.ChargingState)
                .updateValue(service_status);

            // low battery status
            service_status = petkitDevice.getLowBatteryStatusForHomebridge(defaults.config.batteryPersentPerLevel);
            this.log.info(format('battery level status is {}.', service_status ? 'low' : 'normal'));
            service.getCharacteristic(Characteristic.StatusLowBattery)
                .updateValue(service_status);
        };

        // manualLock
        if (petkitDevice.config.get('enable_manualLock')) {
            service = petkitDevice.services.manualLock_service;
            service_status = petkitDevice.status.manualLock;
            this.log.info(format('manualLock status is {}.', service_status ? 'on' : 'off'));
            service.getCharacteristic(Characteristic.On)
                .updateValue(service_status);
        } else {
            this.log.info('manualLock function is disabled.');
        };

        // lightMode
        if (petkitDevice.config.get('enable_lightMode')) {
            service = petkitDevice.services.lightMode_service;
            service_status = petkitDevice.status.lightMode;
            this.log.info(format('lightMode status is {}.', service_status ? 'on' : 'off'));
            service.getCharacteristic(Characteristic.On)
                .updateValue(service_status);
        } else {
            this.log.info('lightMode function is disabled.');
        };

        // food
        service = petkitDevice.services.food_storage_service;
        service_status = petkitDevice.getFoodStatusForHomebridge(defaults.config.foodStorage_alerm_threshold);  
        if (petkitDevice.config.get('reverse_foodStorage_indicator')) {
            this.log.info(format('there is {} food left.', service_status ? 'not enough' : 'enough'));    
        } else {
            this.log.info(format('there is {} food left.', service_status ? 'enough' : 'not enough'));
        };
        service.getCharacteristic(Characteristic.OccupancyDetected)
            .updateValue(service_status);
        
        // BlockDoor
        service = petkitDevice.services.block_door_service;
        service_status = (petkitDevice.status.errorCode === 'blk_d' ? 1 : 0);
        if (service_status) {
            this.log.info(petkitDevice.status.errorDetail);
        };
        service.getCharacteristic(Characteristic.OccupancyDetected)
            .updateValue(service_status);

        // desiccant
        if (petkitDevice.config.get('enable_desiccant')) {
            service = petkitDevice.services.desiccant_level_service;
            service_status = (petkitDevice.status.desiccantLeftDays < petkitDevice.config.get('alert_desiccant_threshold') ? 1 : 0);
            if (service_status == 1) {
                if (petkitDevice.config.get('enable_autoreset_desiccant')) {
                    if (petkitDevice.status.desiccantLeftDays < petkitDevice.config.get('reset_desiccant_threshold')) {
                        service_status = 0;
                        this.hb_desiccantLeftDays_reset(petkitDevice, () => {});
                    } else {        
                        this.log.info(format('desiccant only {} day(s) left, reset it.', petkitDevice.status.desiccantLeftDays));
                    };
                } else {
                    this.log.info('desiccant auto reset function is disabled.');
                };
            } else {
                this.log.info(format('desiccant has {} days left, no need to reset.', petkitDevice.status.desiccantLeftDays));
            };
            service.getCharacteristic(Characteristic.FilterChangeIndication)
                .updateValue(service_status);
            service_status = petkitDevice.status.desiccantLeftDays;
            service.getCharacteristic(Characteristic.FilterLifeLevel)
                .updateValue(service_status);
        } else {
            this.log.info('desiccant service is disabled');
        };
    };

    hb_dropMeal_set(petkitDevice, value, callback) {
        const fast_response = petkitDevice.config.get('fast_response');
        if (fast_response) callback(null);
        if (value) {
            if (petkitDevice.savedData.mealAmount && 
                petkitDevice.services.meal_amount_service.getCharacteristic(Characteristic.On).value) {
                this.log.info(format('drop food:{} meal(s)', petkitDevice.savedData.mealAmount));

                var result = false;
                var timeOfStatus = -1;
                if (petkitDevice.status.batteryStatus === 1) {
                    const startOfToday = new Date(new Date().toLocaleDateString()).getTime()
                    const currentTimeStamp = Date.parse(new Date());
                    timeOfStatus = currentTimeStamp / 1000 - startOfToday / 1000
                    timeOfStatus + 600
                    this.log.info('this is battery mode , so .. delay to feed' + timeOfStatus)
                } else {
                    this.log.info('this is not battery mode')
                }; 
                this.http_saveDailyFeed(petkitDevice, petkitDevice.savedData.mealAmount, timeOfStatus)
                    .then(save_feed_raw => {
                        if (!save_feed_raw) {
                            this.log.error('failed to commuciate with server.');
                        } else {
                            result = this.praseSaveDailyFeedResult(save_feed_raw);
                            this.log.info('food drop result: ' + result ? 'success' : 'failed');
                        };
                    })
                    .catch(error => {
                        this.log.error('food drop failed: ' + error);
                    });
            } else {
                this.log.info('drop food with zero amount, pass.');
            }; 
            if (!fast_response) callback(null); 

            setTimeout(() => {
                this.http_getDeviceDetailStatus(petkitDevice, deviceDetailInfo => {
                    this.uploadStatusToHomebridge(petkitDevice);
                });
            }, 1000);
        };
    };
    
    hb_mealAmount_set(petkitDevice, value, callback) {
        const fast_response = petkitDevice.config.get('fast_response');
        if (fast_response) callback(null);
        petkitDevice.savedData.mealAmount = value;
        petkitDevice.save();
        this.log.info('set meal amount to ' + value);
        if (!fast_response) callback(null);
    }
    
    async http_resetDesiccant(petkitDevice) {
        const deviceId = petkitDevice.config.get('deviceId');
        const url_template = this.globalUrls(petkitDevice.config, 'resetDesiccant');
        const url = format(url_template, deviceId);
        const options = Object.assign(petkitDevice.config.get('http_options'), {
            'url': url,
            'headers': petkitDevice.config.get('headers')
        });
        return await this.http_request(options);
    };
    
    hb_desiccantLeftDays_reset(petkitDevice, callback) {
        const fast_response = petkitDevice.config.get('fast_response');
        if (fast_response) callback(null);
        this.http_resetDesiccant(petkitDevice)
            .then(desiccant_letdays_raw => {
                if (desiccant_letdays_raw && desiccant_letdays_raw.result) {
                    petkitDevice.status.desiccantLeftDays = desiccant_letdays_raw.result;
                    this.log.info(format('reset desiccant left days success, reset to {} days', desiccant_letdays_raw.result));
                } else {
                    this.log.warn('reset desiccant left days with a unrecognizable reply.');
                };
            })
            .catch(error => {
                this.log.error('reset desiccant left days failed: ' + error);
            })
            .then(() => {
                if (!fast_response) callback(null);
            
                setTimeout(() => {
                    this.http_getDeviceDetailStatus(petkitDevice, deviceDetailInfo => {
                        this.uploadStatusToHomebridge(petkitDevice);
                    });
                }, 1000);
            });
    };
    
    async http_updateDeviceSettings(petkitDevice, key, value) {
        let setting_key = petkitDevice.config.get('settings')[key];
        if (setting_key !== undefined) {    
            let data = {};
            data[setting_key] = value;
            const deviceId = petkitDevice.config.get('deviceId');
            const url_template = this.globalUrls(petkitDevice.config, 'updateSettings');
            const url = format(url_template, deviceId, JSON.stringify(data));
            const options = Object.assign(petkitDevice.config.get('http_options'), {
                'url': url,
                'headers': petkitDevice.config.get('headers')
            });
            return await this.http_request(options);
        } else {
            this.log.warn('unsupport setting: ' + key);
            return false;
        };
    }
    
    praseUpdateDeviceSettingsResult(jsonObj) {
        if (!jsonObj) {
            this.log.error('praseUpdateDeviceSettingsResult error: jsonObj is nothing.');
            return false;
        };
        const jsonStr = JSON.stringify(jsonObj);
        this.log.debug(jsonStr);

        if (jsonObj.hasOwnProperty('error')) {
            this.log.error('server reply an error: ' + jsonStr);
            this.log.error('you may need to check your X-Session and other header configure');
            return false;
        };

        if (!jsonObj.hasOwnProperty('result')) {
            this.log.error('JSON.parse error with:' + jsonStr);
            return false;
        };

        return (jsonObj.result === 'success');
    } 
    
    hb_handle_set_deviceSettings(petkitDevice, settingName, status, callback = null) {
        let result = false;
        this.http_updateDeviceSettings(petkitDevice, settingName, status)
            .then(device_settings_raw => {
                if (!device_settings_raw) {
                    this.log.error('failed to commuciate with server.');
                } else if (this.praseUpdateDeviceSettingsResult(device_settings_raw)) {
                    result = true;
                    petkitDevice.status[settingName] = status;
                };
            })
            .catch(error => {
                this.log.error(error);
            })
            .then(() => {
                if (callback) callback(result);
                // this.updataDeviceDetail();
            });
    }
    
    hb_serviceStatus(petkitDevice, name, value, callback) {
        const settingName = name;
        const settingValue = (value ? 1 : 0);
        const fast_response = petkitDevice.config.get('fast_response');
        if (fast_response) callback(null);
        this.log.debug(format('set {} to: {}', settingName, settingValue));
        this.hb_handle_set_deviceSettings(petkitDevice, settingName, settingValue, result => {
            if (result) {
                this.log.info(format('set {} to: {}, success', settingName, settingValue));
            } else {
                this.log.warn(format('set {} to: {}, failed', settingName, settingValue));
            };
            if (!fast_response) callback(null);
            setTimeout(() => {
                this.http_getDeviceDetailStatus(petkitDevice, deviceDetailInfo => {
                    this.uploadStatusToHomebridge(petkitDevice);
                });
            }, 1000);
        });
    };
    
    setupAccessory(petkitDevice) {
        let accessory = petkitDevice.accessory;
        let config = petkitDevice.config;
        let service_name = undefined;
        let service_status = undefined;

        // setup meal drop service
        service_name = config.get('DropMeal_name');
        let drop_meal_service = accessory.getService(service_name);
        if (!drop_meal_service) {
            // service not exist, create service
            drop_meal_service = accessory.addService(Service.Switch, service_name, service_name);
            if (!drop_meal_service) {
                this.log.error('petkit device service create failed: ' + service_name);
                return false;
            };
        };

        drop_meal_service.setCharacteristic(Characteristic.On, 0);
        drop_meal_service.getCharacteristic(Characteristic.On)
            .on('set', this.hb_dropMeal_set.bind(this, petkitDevice));

        petkitDevice.services.drop_meal_service = drop_meal_service;

        // setup meal amount service
        service_name = config.get('MealAmount_name');
        let meal_amount_service = accessory.getService(service_name);
        if (!meal_amount_service) {
            // service not exist, create service
            meal_amount_service = accessory.addService(Service.Fan, service_name, service_name);
            if (!meal_amount_service) {
                this.log.error('petkit device service create failed: ' + service_name);
                return false;
            };
        };

        service_status = petkitDevice.config.get('meal_amount');
        meal_amount_service.setCharacteristic(Characteristic.On, service_status !== 0);
        meal_amount_service.setCharacteristic(Characteristic.RotationSpeed, service_status);
        meal_amount_service.getCharacteristic(Characteristic.RotationSpeed)
            .on('set', this.hb_mealAmount_set.bind(this, petkitDevice))
            .setProps({
                minValue: defaults.config.min_amount,
                maxValue: defaults.config.max_amount,
                minStep: 1
            });
        petkitDevice.savedData.mealAmount = service_status;

        petkitDevice.services.meal_amount_service = meal_amount_service;

        // setup food storage indicator service
        service_name = config.get('FoodStorage_name');
        let food_storage_service = accessory.getService(service_name);
        if (!food_storage_service) {
            // service not exist, create service
            food_storage_service = accessory.addService(Service.OccupancySensor, service_name, service_name);
            if (!food_storage_service) {
                this.log.error('petkit device service create failed: ' + service_name);
                return false;
            };
        };

        service_status = petkitDevice.getFoodStatusForHomebridge(defaults.config.foodStorage_alerm_threshold);    
        food_storage_service.setCharacteristic(Characteristic.OccupancyDetected, service_status);

        petkitDevice.services.food_storage_service = food_storage_service;

        // setup block door service
        service_name = config.get('BlockDoor_name');
        let block_door_service = accessory.getService(service_name);
        if (!block_door_service) {
            // service not exist, create service
            block_door_service = accessory.addService(Service.OccupancySensor, service_name, service_name);
            if (!block_door_service) {
                this.log.error('petkit device service create failed: ' + service_name);
                return false;
            };
        };

        service_status = (petkitDevice.status.errorCode === 'blk_d' ? 1 : 0);
        block_door_service.setCharacteristic(Characteristic.OccupancyDetected, service_status);

        petkitDevice.services.block_door_service = block_door_service;
        
        // setup feed daily service
        service_name = config.get('FeedDaily_name');
        let feed_daily_service = accessory.getService(service_name);
        if (!feed_daily_service) {
            // service not exist, create service
            feed_daily_service = accessory.addService(Service.Switch, service_name, service_name);
            if (!drop_meal_service) {
                this.log.error('petkit device service create failed: ' + service_name);
                return false;
            };
        };

        service_status = petkitDevice.config.get('enabled_daily_feeds');
        feed_daily_service.setCharacteristic(Characteristic.On, service_status);
        feed_daily_service.getCharacteristic(Characteristic.On)
            .on('set', this.hb_feedDailyList_set.bind(this, petkitDevice));

        petkitDevice.services.feed_daily_service = feed_daily_service;    
        
        // setup desiccant left days service
        if (config.get('enable_desiccant')) {
            service_name = config.get('DesiccantLevel_name');
            let desiccant_level_service = accessory.getService(service_name);
            if (!desiccant_level_service) {
                // service not exist, create service
                desiccant_level_service = accessory.addService(Service.FilterMaintenance, service_name, service_name);
                if (!desiccant_level_service) {
                    this.log.error('petkit device service create failed: ' + service_name);
                    return false;
                };
            };

            service_status = (petkitDevice.status.desiccantLeftDays < config.get('alert_desiccant_threshold') ? 1 : 0);
            desiccant_level_service.setCharacteristic(Characteristic.FilterChangeIndication, service_status);
            service_status = petkitDevice.status.desiccantLeftDays;
            desiccant_level_service.setCharacteristic(Characteristic.FilterLifeLevel, service_status);
            desiccant_level_service.getCharacteristic(Characteristic.FilterLifeLevel)
                .setProps({
                    minValue: defaults.config.min_desiccantLeftDays,
                    maxValue: defaults.config.max_desiccantLeftDays,
                    minStep: 1
                });
            desiccant_level_service.getCharacteristic(Characteristic.ResetFilterIndication)
                .on('set', this.hb_desiccantLeftDays_reset.bind(this, petkitDevice));

            petkitDevice.services.desiccant_level_service = desiccant_level_service;
        };

        // setup manualLock setting service
        if (config.get('enable_manualLock')) {
            service_name = config.get('ManualLock_name');
            let manualLock_service = accessory.getService(service_name);
            if (!manualLock_service) {
                // service not exist, create service
                manualLock_service = accessory.addService(Service.Switch, service_name, service_name);
                if (!manualLock_service) {
                    this.log.error('petkit device service create failed: ' + service_name);
                    return false;
                };
            };

            service_status = petkitDevice.status.manualLock;
            manualLock_service.setCharacteristic(Characteristic.On, service_status);
            manualLock_service.getCharacteristic(Characteristic.On)
                .on('set', this.hb_serviceStatus.bind(this, petkitDevice, 'manualLock'));

            petkitDevice.services.manualLock_service = manualLock_service;
        };

        // setup lightMode setting service
        if (config.get('enable_lightMode')) {
            service_name = config.get('LightMode_name');
            let lightMode_service = accessory.getService(service_name);
            if (!lightMode_service) {
                // service not exist, create service
                lightMode_service = accessory.addService(Service.Switch, service_name, service_name);
                if (!lightMode_service) {
                    this.log.error('petkit device service create failed: ' + service_name);
                    return false;
                };
            };

            service_status = petkitDevice.status.lightMode;
            lightMode_service.setCharacteristic(Characteristic.On, service_status);
            lightMode_service.getCharacteristic(Characteristic.On)
                .on('set', this.hb_serviceStatus.bind(this, petkitDevice, 'lightMode'));
            
            petkitDevice.services.lightMode_service = lightMode_service;
        };

        // setup battery status service
        if (petkitDevice.status.batteryStatus !== undefined) {
            service_name = config.get('Battery_name');
            let battery_status_service = accessory.getService(service_name);
            if (!battery_status_service) {
                // service not exist, create service
                battery_status_service = accessory.addService(Service.BatteryService, service_name, service_name);
                if (!battery_status_service) {
                    this.log.error('petkit device service create failed: ' + service_name);
                    return false;
                };
            };

            service_status = petkitDevice.status.batteryPower * defaults.config.batteryPersentPerLevel;
            battery_status_service.setCharacteristic(Characteristic.BatteryLevel, service_status);
            service_status = (petkitDevice.status.batteryStatus === 0 ? 1 : 0);
            battery_status_service.setCharacteristic(Characteristic.ChargingState, service_status);
            service_status = petkitDevice.getLowBatteryStatusForHomebridge(defaults.config.batteryPersentPerLevel);
            battery_status_service.setCharacteristic(Characteristic.StatusLowBattery, service_status);
            
            petkitDevice.services.battery_status_service = battery_status_service;
        };

        // setup divice information service
        let info_service = accessory.getService(Service.AccessoryInformation);
        if (!info_service) {
            // service not exist, create service
            info_service = accessory.addService(Service.AccessoryInformation);
            if (!info_service) {
                this.log.error('petkit device service create failed: info_service');
                return false;
            };
        };
        
        info_service
            .setCharacteristic(Characteristic.Identify, config.get('deviceId'))
            .setCharacteristic(Characteristic.Manufacturer, config.get('manufacturer'))
            .setCharacteristic(Characteristic.Model, config.get('model'))
            .setCharacteristic(Characteristic.SerialNumber, config.get('sn'))
            // infomation below changed from petkit app require a homebridge reboot to take effect.
            .setCharacteristic(Characteristic.Name, config.get('name'))
            .setCharacteristic(Characteristic.FirmwareRevision, config.get('firmware'));

        petkitDevice.services.info_service = info_service;
        
        return true;
    };

    setupPolling(petkitDevice) {
        if (petkitDevice.config.get('enable_polling')) {
            const polling_interval_ms = petkitDevice.config.get('polling_interval') * 1000;
            const polling_options = {
                'longpolling': true,
                'interval': polling_interval_ms,
                'longpollEventName': 'deviceStatusUpdatePoll'
            };
    
            setTimeout(() => {
                petkitDevice.events.polling_event = pollingtoevent(done => {
                    this.log.info('polling start...');
                    this.http_getDeviceDetailStatus(petkitDevice, deviceDetailInfo => {
                        this.uploadStatusToHomebridge(petkitDevice);
                        this.log.info('polling end...');
                        done();
                    });
                }, polling_options);
            }, polling_interval_ms);
        } else {
            this.log.warn('polling is disabled.');
        };
    };
    
    removeAccessories() {
        this.api.unregisterPlatformAccessories(pluginName, platformName, this.accessories);
        this.accessories.splice(0, this.accessories.length);
    };
    
    configureAccessory(accessory) {
        this.accessories.push(accessory);
    };
    
    addAccessory(name, config) {
        const uuid = UUIDGen.generate(name);
        const accessory = new this.api.platformAccessory(name, uuid, name);
        if (!accessory) {
            this.log.error('initialize Petkit Feeder failed: could not create accessory');
            return;
        };
        let petkitDevice = new petkitFeederDevice();
        petkitDevice.accessory = accessory;
        petkitDevice.config = config;
        this.log.debug('request initial device status from Petkit server.');
        this.http_getDeviceDetailStatus(petkitDevice, deviceDetailInfo => {
            if (deviceDetailInfo) {
                petkitDevice.config.set('sn', deviceDetailInfo.sn);
                petkitDevice.config.set('firmware', deviceDetailInfo.firmware);
                petkitDevice.config.assign('headers', { 'X-TimezoneId': deviceDetailInfo.locale });
                    
                if (this.setupAccessory(petkitDevice)) {
                    this.configureAccessory(petkitDevice.accessory);
                    this.api.registerPlatformAccessories(pluginName, platformName, [petkitDevice.accessory]);
                    
                    this.log.info(format('initialize Petkit Feeder device({}) success.', config.get('name')));
                    //feed DailyList
                    this.hb_feedDailyList_set(petkitDevice, petkitDevice.config.get('enabled_daily_feeds'), () => {});
                    //polling
                    this.setupPolling(petkitDevice);
                } else {
                    this.log.error(format('initialize Petkit Feeder device({}) failed.', config.get('name')));
                };           
            } else {
                this.log.warn(format('bypass initialize Petkit Feeder device({}).', config.get('name')));
            };
        });
    };
    
    initializeAccessory(config) {
        this.log.info('initializing Petkit Feeder device.');

        let validDevice = undefined;
        this.log.debug('request device info from Petkit server.');
        this.http_getOwnDevice(config)
            .then(raw => {
                if (raw) {
                    const user_deviceId = config.get('deviceId');
                    const user_model = config.get('model');
                    const owned_devices = this.praseGetOwnedDevice(raw);
                    if (owned_devices.length === 0) {
                        this.log.error(format('sorry that this plugin only works with these device type:{}.', JSON.stringify(defaults.models)));
                    } else if (owned_devices.length === 1) {
                        if ((!user_deviceId || owned_devices[0].id == user_deviceId) && owned_devices[0].type == user_model) {
                            this.log.info(format('found you ownd one {} with deviceId: {}.', owned_devices[0].type, owned_devices[0].id));
                        } else {
                            this.log.warn(format('found you just ownd one {} with deviceId: {}', owned_devices[0].type , owned_devices[0].id));
                            this.log.warn(format('which is not the same with the deviceId you set: {}', user_deviceId));
                            this.log.warn(format('will use {} instead', owned_devices[0].id));
                        };
                        validDevice = owned_devices[0];
                    } else {
                        let match_device = owned_devices.find(device => user_deviceId && device.id == user_deviceId && device.type == user_model);
                        if (undefined === match_device) {
                            const devicesIds = owned_devices.map(device => {
                                return { 'id': device.id, 'name': device.name, 'model': device.type};
                            });
                            this.log.error('seems that you ownd more than one feeder, but the device id you set is not here.');
                            this.log.error(format('do you mean one of this: ', JSON.stringify(devicesIds)));
                        } else {
                            this.log.info(format('found you ownd one {} with deviceId: {}', match_device.type, match_device.id));
                            validDevice = match_device;
                        };
                    };
                } else {
                    this.log.error('unable to fetch information from petkit server. skip adding this petkit device.');
                };

            })
            .catch(error => {
                this.log.error('unable to determine whether the deviceId you set is valid: ' + error.stack ? error.stack : error);
            })
            .then(() => {
                if (!validDevice) {
                    this.log.error('initialize Petkit Feeder failed: could not find supported device.');
                    return;
                };
                config.set('deviceId', validDevice.id);
                config.set('name', validDevice.name);
                config.set('model', validDevice.type);
            
                this.removeAccessories();
                this.addAccessory(validDevice.id.toString(), config);       
            });
    };
};
