'use strict';

class petkitFeederDevice {
    constructor() {
        let accessory = undefined;
        this.config = undefined;
        this.events = {
            'polling_event': undefined
        };
        this.services = {
            'drop_meal_service': undefined,
            'meal_amount_service': undefined,
            'food_storage_service': undefined,
            'desiccant_level_service': undefined,
            'manualLock_service': undefined,
            'lightMode_service': undefined,
            'battery_status_service': undefined,
            'feed_daily_service': undefined,
            'info_service': undefined
        };
        this.status = {     
            'lastUpdate': undefined,
            'food' : undefined,                
            'batteryPower': undefined,  
            'batteryStatus': undefined,
            'desiccantLeftDays' : undefined,   
            'manualLock': undefined,
            'lightMode': undefined
        };
        this.feedDailyList = {
            'enabled': undefined,
            'meals': undefined
        };
        this.savedData = {
            'mealAmount': 2
        };

        Object.defineProperty(this, 'accessory', {
            get() {
                return accessory;
            },
            set(value) {
                accessory = value;
                this.load();
            }
        });

        this.load();
    };

    save() {
        if (this.accessory && this.savedData) {
            this.accessory.context = this.savedData;
        };
    };

    load() {
        if (this.accessory && this.accessory.context) {
            this.savedData = Object.assign(this.savedData, this.accessory.context);
        };
    };
    
    getFoodStatusForHomebridge(foodStorage_alerm_threshold) {
        if (this.config.get('model') === 'Feeder') {
            if (this.config.get('reverse_foodStorage_indicator')) {
                return (this.status.food < foodStorage_alerm_threshold ? 1 : 0);
            } else {
                return (this.status.food < foodStorage_alerm_threshold ? 0 : 1);
            };
        } else {
            if (this.config.get('reverse_foodStorage_indicator')) {
                return (this.status.food === 1 ? 0 : 1);
            } else {
                return (this.status.food === 1 ? 1 : 0);
            };
        };
    };
    
    getLowBatteryStatusForHomebridge(batteryPersentPerLevel) {
        if (this.status.batteryPower * batteryPersentPerLevel <= 50) {
            if (this.status.batteryStatus === 0) {
                return (this.config.get('ignore_battery_when_charging') ? 0 : 1);         
            } else return 1;
        } else return 0;
    };   
};

module.exports = petkitFeederDevice;
