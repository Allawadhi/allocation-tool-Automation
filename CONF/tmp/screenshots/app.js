var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "Creating the Prospect using the Mandatory elements only|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082861138,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=8b9d164d-b475-4e11-ace4-953d424ec91b# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082886366,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082886367,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082886370,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082886370,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082886371,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082886371,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082886371,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082886371,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082888879,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082889073,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082894337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082894337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082894337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082894337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082894337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082894337,
                "type": ""
            }
        ],
        "screenShotFile": "00ee00a9-0039-0038-00f6-009300b40069.png",
        "timestamp": 1607082894315,
        "duration": 13061
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With Team member|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f100ce-00ae-0073-003b-00d30070006a.png",
        "timestamp": 1607082907492,
        "duration": 24398
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With multiple Team members|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006f0000-0082-006d-0053-0065004b0009.png",
        "timestamp": 1607082932005,
        "duration": 25754
    },
    {
        "description": "Testing the Prospect page--> Accordion should be clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008900ce-0004-003c-00b3-003f002a002d.png",
        "timestamp": 1607082957852,
        "duration": 8663
    },
    {
        "description": " Checking the project filter is editable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082969084,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082969270,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082972191,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082972362,
                "type": ""
            }
        ],
        "screenShotFile": "007600bb-0089-0038-0085-005500e30037.png",
        "timestamp": 1607082971451,
        "duration": 3255
    },
    {
        "description": " Checking the Status filter is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082976960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082976961,
                "type": ""
            }
        ],
        "screenShotFile": "00e50085-0034-0011-00d3-001f0033003d.png",
        "timestamp": 1607082974799,
        "duration": 2346
    },
    {
        "description": " Calculate number of values of Status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082979467,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082979467,
                "type": ""
            }
        ],
        "screenShotFile": "00cb009a-0093-00c4-007c-00e900e900dc.png",
        "timestamp": 1607082977236,
        "duration": 2360
    },
    {
        "description": " Checking the  Group filter is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082981916,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082981916,
                "type": ""
            }
        ],
        "screenShotFile": "0099001a-008a-007d-0055-00eb000500e5.png",
        "timestamp": 1607082979701,
        "duration": 2331
    },
    {
        "description": " Calculate number of values of group Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082984314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082984314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082984314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082984314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082984314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082984314,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082986372,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082986373,
                "type": ""
            }
        ],
        "screenShotFile": "006e0017-005a-0055-0089-0063004b0042.png",
        "timestamp": 1607082982132,
        "duration": 4417
    },
    {
        "description": " Checking the  hiring status is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082987074,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082987213,
                "type": ""
            }
        ],
        "screenShotFile": "00e00088-003c-00df-0016-0033006d00be.png",
        "timestamp": 1607082986700,
        "duration": 2918
    },
    {
        "description": " Calculate number of values of hiring status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082991914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082991914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082991914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082991914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082991914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082991914,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082993964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082993964,
                "type": ""
            }
        ],
        "screenShotFile": "000e00e4-00af-00d2-0091-00fe00a90087.png",
        "timestamp": 1607082989719,
        "duration": 4463
    },
    {
        "description": " Checking the  hiring required is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607082994523,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607082994636,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082998550,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082998550,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082998550,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082998550,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082998550,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607082998550,
                "type": ""
            }
        ],
        "screenShotFile": "005400f8-00e1-00d7-004b-00cd009c0088.png",
        "timestamp": 1607082994271,
        "duration": 4537
    },
    {
        "description": " Calculate number of values of hiring status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607083001359,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607083001509,
                "type": ""
            }
        ],
        "screenShotFile": "00ec00c2-00dd-001b-0004-00ab00b80032.png",
        "timestamp": 1607082998924,
        "duration": 4921
    },
    {
        "description": "Disable State|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003b00d3-0099-0026-00e4-00e400a50084.png",
        "timestamp": 1607083003953,
        "duration": 108
    },
    {
        "description": "Hover Color Change|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083006312,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083006313,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083006313,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083006313,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083006313,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083006313,
                "type": ""
            }
        ],
        "screenShotFile": "00c6005c-003e-0044-004f-008a00030005.png",
        "timestamp": 1607083004257,
        "duration": 6794
    },
    {
        "description": "Clear Button Present or Not|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607083013180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607083013180,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083014719,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083014719,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083014719,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083014719,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083014719,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083014719,
                "type": ""
            }
        ],
        "screenShotFile": "00900009-005c-0097-00d9-00a600d7003e.png",
        "timestamp": 1607083011169,
        "duration": 7478
    },
    {
        "description": "Clear Button is Clickable & only appears when filter criteria is applied|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607083018988,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607083019203,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083022722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083022722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083022722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083022722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083022722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607083022723,
                "type": ""
            }
        ],
        "screenShotFile": "000500fa-006f-004f-0071-00580076005d.png",
        "timestamp": 1607083018750,
        "duration": 3954
    },
    {
        "description": "Adding Project to the Quant|Testing the Allocation Tool -- People Directory",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fe00a8-0005-006e-009a-002700140004.png",
        "timestamp": 1607083025183,
        "duration": 23477
    },
    {
        "description": "Checking the Resolution of the page for Filter Area |Testing the Allocation Tool -- People Directory",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e8007b-001e-00ff-00aa-007b00aa00a0.png",
        "timestamp": 1607083048777,
        "duration": 13084
    },
    {
        "description": "Testing the People Directory--> profile page shall open in a new when clicked on QUAnt name|Testing the Allocation Tool -- People Directory",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23186,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/profile/403 - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607083062244,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607083062421,
                "type": ""
            }
        ],
        "screenShotFile": "000f00e2-00a0-004c-002e-006c004c00bd.png",
        "timestamp": 1607083062020,
        "duration": 4918
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926762571,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=1d3ba83c-a0e3-4ad3-b244-0c427f4e61e0# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926788346,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926788346,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926788347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926788347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926788347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926788347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926788347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926788347,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926795103,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926795103,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool/new-prospects/create - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926797393,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool/new-prospects/create - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926797393,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool/new-prospects/create - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926797394,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool/new-prospects/create - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926797394,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool/new-prospects/create - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926797394,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool/new-prospects/create - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926797394,
                "type": ""
            }
        ],
        "screenShotFile": "001800f4-001a-0027-0090-007700170086.png",
        "timestamp": 1607926795098,
        "duration": 12918
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With Team member|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001200db-00dd-0040-0076-0090002600de.png",
        "timestamp": 1607926808213,
        "duration": 24212
    },
    {
        "description": "Testing the Prospect page--> Accordion should be clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fb0057-004d-00b4-0076-00f100060085.png",
        "timestamp": 1607926832553,
        "duration": 8577
    },
    {
        "description": " Checking the project filter is editable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926843636,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926843831,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926848549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926848550,
                "type": ""
            }
        ],
        "screenShotFile": "00b70043-0071-0039-007b-00d400f500c6.png",
        "timestamp": 1607926845997,
        "duration": 3295
    },
    {
        "description": " Checking the Status filter is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926851598,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926851599,
                "type": ""
            }
        ],
        "screenShotFile": "00ed00aa-0083-00e2-005c-007000df0027.png",
        "timestamp": 1607926849410,
        "duration": 2831
    },
    {
        "description": " Calculate number of values of Status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926852830,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926852978,
                "type": ""
            }
        ],
        "screenShotFile": "009500fc-00bc-00f0-0060-00a5006a00ff.png",
        "timestamp": 1607926852362,
        "duration": 3154
    },
    {
        "description": " Checking the  Group filter is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926855990,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926856124,
                "type": ""
            }
        ],
        "screenShotFile": "0079005d-00aa-0019-00d9-00ad008b0041.png",
        "timestamp": 1607926855661,
        "duration": 2933
    },
    {
        "description": " Calculate number of values of group Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926861006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926861006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926861006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926861006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926861006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926861006,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926863060,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926863061,
                "type": ""
            }
        ],
        "screenShotFile": "00e500d2-0002-000b-0036-0064009c00a9.png",
        "timestamp": 1607926858726,
        "duration": 4819
    },
    {
        "description": " Checking the  hiring status is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926865954,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926865955,
                "type": ""
            }
        ],
        "screenShotFile": "0061002d-00c6-00d2-00ff-001500640008.png",
        "timestamp": 1607926863680,
        "duration": 2684
    },
    {
        "description": " Calculate number of values of hiring status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926868742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926868742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926868742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926868742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926868742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926868742,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926868889,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926869054,
                "type": ""
            }
        ],
        "screenShotFile": "004f000f-006e-00b4-004c-00ad00c9004b.png",
        "timestamp": 1607926866497,
        "duration": 4850
    },
    {
        "description": " Checking the  hiring required is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926871928,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926872056,
                "type": ""
            }
        ],
        "screenShotFile": "007e0059-0020-0048-001b-005e00790068.png",
        "timestamp": 1607926871477,
        "duration": 3056
    },
    {
        "description": " Calculate number of values of hiring status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926876886,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926876886,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926876886,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926876886,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926876886,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926876886,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926877071,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926877214,
                "type": ""
            }
        ],
        "screenShotFile": "0062008b-00f3-00e5-00dc-00d0008d003f.png",
        "timestamp": 1607926874658,
        "duration": 4899
    },
    {
        "description": "Disable State|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00bb000a-006c-00be-0083-00ef00330056.png",
        "timestamp": 1607926879660,
        "duration": 152
    },
    {
        "description": "Hover Color Change|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926882006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926882006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926882006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926882006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926882006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926882006,
                "type": ""
            }
        ],
        "screenShotFile": "008000b1-0072-00f7-00f2-00e000a40059.png",
        "timestamp": 1607926879962,
        "duration": 6875
    },
    {
        "description": "Clear Button Present or Not|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926887087,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926887244,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926890425,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926890425,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926890425,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926890425,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926890425,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926890425,
                "type": ""
            }
        ],
        "screenShotFile": "00370087-00a5-00fd-000d-006c00c7001e.png",
        "timestamp": 1607926886956,
        "duration": 7657
    },
    {
        "description": "Clear Button is Clickable & only appears when filter criteria is applied|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926894877,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926895012,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926898695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926898695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926898695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926898695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926898695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607926898695,
                "type": ""
            }
        ],
        "screenShotFile": "00bf006b-00ad-00e6-00b6-000300c900af.png",
        "timestamp": 1607926894734,
        "duration": 3956
    },
    {
        "description": "Adding Project to the Quant|Testing the Allocation Tool -- People Directory",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00440014-00a9-0042-00b7-00e4002700d6.png",
        "timestamp": 1607926901106,
        "duration": 23511
    },
    {
        "description": "Checking the Resolution of the page for Filter Area |Testing the Allocation Tool -- People Directory",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00800009-00fb-0025-00c3-0061006c005c.png",
        "timestamp": 1607926924730,
        "duration": 12896
    },
    {
        "description": "Testing the People Directory--> profile page shall open in a new when clicked on QUAnt name|Testing the Allocation Tool -- People Directory",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13825,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/profile/403 - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607926937952,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607926938131,
                "type": ""
            }
        ],
        "screenShotFile": "00c80054-0076-0072-005f-009500cb008a.png",
        "timestamp": 1607926937756,
        "duration": 5067
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 14593,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Expected 'Sign in – Google accounts' to be 'Zepplin'.",
            "Failed: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "Error: Failed expectation\n    at /home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:12:59\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.close()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.close (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:982:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as close] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:16:11)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.close()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.close (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:982:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as close] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:19:11)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run afterEach in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:18:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607927123084,
                "type": ""
            }
        ],
        "timestamp": 1607927121811,
        "duration": 20140
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(css selector, *[id=\"identifierId\"]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:9:60)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.close()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.close (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:982:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as close] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:19:11)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run afterEach in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:18:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607927206468,
                "type": ""
            }
        ],
        "timestamp": 1607927205613,
        "duration": 4715
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.navigate().to(http://dev.zeppl.in/)\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.to (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1133:25)\n    at Driver.get (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:988:28)\n    at ProtractorBrowser.get (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:653:32)\n    at ProspectModulefromStart.ProspectModulefromStart (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ProspectModulefromStart.js:14:14)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:14:21)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.executeScript()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.executeScript (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:878:16)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/by.js:191:35\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1068:28\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2974:25\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at Driver.call (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:901:23)\n    at Driver.findElementsInternal_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1068:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1043:19)\n    at Object.findElementsOverride (/usr/local/share/.config/yarn/global/node_modules/protractor/built/locators.js:200:31)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:156:40\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at createprospects.prospect (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/CreateProspect.js:8:87)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:19:17)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Creating the Prospect using the Mandatory elements only\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:17:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927210434,
        "duration": 54
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With Team member|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.navigate().to(http://dev.zeppl.in/)\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.to (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1133:25)\n    at Driver.get (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:988:28)\n    at ProtractorBrowser.get (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:653:32)\n    at ProspectModulefromStart.ProspectModulefromStart (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ProspectModulefromStart.js:14:14)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:14:21)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.executeScript()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.executeScript (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:878:16)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/by.js:191:35\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1068:28\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2974:25\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at Driver.call (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:901:23)\n    at Driver.findElementsInternal_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1068:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1043:19)\n    at Object.findElementsOverride (/usr/local/share/.config/yarn/global/node_modules/protractor/built/locators.js:200:31)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:156:40\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at createprospects.prospect1 (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/CreateProspect.js:42:86)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:25:17)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Creating the Prospect using the Mandatory elements only With Team member\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:24:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927210505,
        "duration": 17
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With multiple Team members|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.navigate().to(http://dev.zeppl.in/)\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.to (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1133:25)\n    at Driver.get (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:988:28)\n    at ProtractorBrowser.get (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:653:32)\n    at ProspectModulefromStart.ProspectModulefromStart (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ProspectModulefromStart.js:14:14)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:14:21)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.executeScript()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.executeScript (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:878:16)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/by.js:191:35\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1068:28\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2974:25\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at Driver.call (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:901:23)\n    at Driver.findElementsInternal_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1068:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1043:19)\n    at Object.findElementsOverride (/usr/local/share/.config/yarn/global/node_modules/protractor/built/locators.js:200:31)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:156:40\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at createprospects.prospect2 (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/CreateProspect.js:94:86)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:29:17)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Creating the Prospect using the Mandatory elements only With multiple Team members\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:28:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927210547,
        "duration": 101
    },
    {
        "description": "Testing the Prospect page--> Accordion should be clickable|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.navigate().to(http://dev.zeppl.in/)\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.to (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1133:25)\n    at Driver.get (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:988:28)\n    at ProtractorBrowser.get (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:653:32)\n    at ProspectModulefromStart.ProspectModulefromStart (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ProspectModulefromStart.js:14:14)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:14:21)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //li[text()=' Saurabh2 ']/../../../..))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as getAttribute] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as getAttribute] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:41:60)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as getCssValue] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as getCssValue] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:41:82)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"Testing the Prospect page--> Accordion should be clickable\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:38:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927210682,
        "duration": 2022
    },
    {
        "description": " Checking the project filter is editable|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@placeholder='Project']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:58:57)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Checking the project filter is editable\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:57:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927212756,
        "duration": 20
    },
    {
        "description": " Checking the Status filter is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Status') ]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:65:56)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Checking the Status filter is clickable\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:64:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927212800,
        "duration": 11
    },
    {
        "description": " Calculate number of values of Status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Status') ]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:71:56)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Calculate number of values of Status Filter \") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:70:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927212836,
        "duration": 25
    },
    {
        "description": " Checking the  Group filter is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Group') ]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:80:51)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Checking the  Group filter is clickable\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:79:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927212884,
        "duration": 15
    },
    {
        "description": " Calculate number of values of group Filter |Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Group') ]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:86:51)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Calculate number of values of group Filter \") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:85:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927212922,
        "duration": 13
    },
    {
        "description": " Checking the  hiring status is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Hiring Status')]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:94:58)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Checking the  hiring status is clickable\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:93:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927212970,
        "duration": 11
    },
    {
        "description": " Calculate number of values of hiring status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Hiring Status')]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:99:58)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Calculate number of values of hiring status Filter \") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:98:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213015,
        "duration": 13
    },
    {
        "description": " Checking the  hiring required is clickable|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Hiring Required')]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:107:60)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Checking the  hiring required is clickable\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:106:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213055,
        "duration": 11
    },
    {
        "description": " Calculate number of values of hiring status Filter |Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [starts-with(text(),'Hiring Required')]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:112:60)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\" Calculate number of values of hiring status Filter \") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:111:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213097,
        "duration": 14
    },
    {
        "description": "Disable State|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //button [@disabled]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: Run it(\"Disable State\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:123:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213132,
        "duration": 13
    },
    {
        "description": "Hover Color Change|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //button [@disabled]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as getAttribute] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as getAttribute] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:129:56)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as getCssValue] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as getCssValue] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:129:78)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"Hover Color Change\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:127:6)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213178,
        "duration": 25
    },
    {
        "description": "Clear Button Present or Not|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.navigate().refresh()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.refresh (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1167:25)\n    at ProtractorBrowser.refresh (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:781:43)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:149:13)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"Clear Button Present or Not\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:148:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213229,
        "duration": 10
    },
    {
        "description": "Clear Button is Clickable & only appears when filter criteria is applied|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div [@class='sidenav-hamburger']))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_submenu.clicksubmenu (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickSubmenuitem.js:5:57)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:14:26)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:13:5)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.navigate().refresh()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.refresh (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1167:25)\n    at ProtractorBrowser.refresh (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:781:43)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:155:13)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"Clear Button is Clickable & only appears when filter criteria is applied\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:153:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927213268,
        "duration": 11
    },
    {
        "description": "Adding Project to the Quant|Testing the Allocation Tool -- People Directory",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 15140,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, (//div [contains (text(),'People')])))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at click_tabelem.clicktabelements (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/ClickTabs.js:12:61)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/PD_Module_spec.js:19:15)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/PD_Module_spec.js:17:2)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/PD_Module_spec.js:15:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, //span [ contains (text(), ' Saurabh Allawa') ]))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/PD_Module_spec.js:25:75)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"Adding Project to the Quant\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/PD_Module_spec.js:24:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/PD_Module_spec.js:15:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927215302,
        "duration": 34
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 15656,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard",
            "NoSuchSessionError: Tried to run command without establishing a connection"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchSessionError: Tried to run command without establishing a connection\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607927322038,
        "duration": 9735
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 16261,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "006300b1-0017-0046-0091-004b00150024.png",
        "timestamp": 1607927356312,
        "duration": 8577
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 16824,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bf00d7-00f4-0068-0079-000c00b400bc.png",
        "timestamp": 1607927458312,
        "duration": 8428
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 18670,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard",
            "NoSuchSessionError: Tried to run command without establishing a connection"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "NoSuchSessionError: Tried to run command without establishing a connection\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:63:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1607928656099,
        "duration": 8363
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 19544,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a700bd-00ba-003a-0060-00bf00d7003c.png",
        "timestamp": 1607929286259,
        "duration": 7703
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 20460,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607929563416,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=341c7b4f-ced9-4483-ab36-74e5b044c984# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607929576936,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607929576937,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607929582025,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607929582025,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607929582025,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607929582026,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607929582026,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607929582026,
                "type": ""
            }
        ],
        "screenShotFile": "00320043-0063-00e3-0080-00a700e40029.png",
        "timestamp": 1607929562429,
        "duration": 19735
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 21378,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "0032001d-00ff-0074-00e5-0042000800eb.png",
        "timestamp": 1607930359268,
        "duration": 7281
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 21372,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: unknown error: cannot determine loading status\nfrom disconnected: Unable to receive message from renderer\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: cannot determine loading status\nfrom disconnected: Unable to receive message from renderer\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.getTitle()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.getTitle (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1000:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)",
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:62:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930356836,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=a9b857d1-8451-458c-b516-f154a3fbeffc# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607930370933,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930370934,
                "type": ""
            }
        ],
        "timestamp": 1607930355584,
        "duration": 15449
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 21933,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e0004d-00d2-00d5-006a-00cf0076006e.png",
        "timestamp": 1607930440902,
        "duration": 7264
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 21927,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: chrome not reachable\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.takeScreenshot (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1085:17)\n    at run (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:58:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:66:16)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/CONF/cong.js:62:15)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930438074,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=cac51ccc-0947-4698-821b-d30fd64a68e6# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607930451602,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930451602,
                "type": ""
            }
        ],
        "timestamp": 1607930437178,
        "duration": 19530
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": false,
        "pending": false,
        "os": "linux",
        "instanceId": 22499,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": [
            "Failed: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard"
        ],
        "trace": [
            "ElementNotInteractableError: Element <input class=\"whsOnd zHQkBf\" name=\"password\" type=\"password\"> is not reachable by keyboard\n    at Object.throwDecodedError (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:514:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:519:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:461:65\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as sendKeys] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at Loginin.loginasSaurabh (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/login.js:13:62)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:10:14)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Login as Saurabh\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:5:3)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/LoginTestsaurabh_spec.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f80022-008f-0001-0088-007d00b6007d.png",
        "timestamp": 1607930509122,
        "duration": 7310
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 22798,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d2003f-00c0-00c4-006e-00010039002a.png",
        "timestamp": 1607930621535,
        "duration": 23567
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23087,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930655755,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=4b9aca9e-1478-424a-a4d4-09e4d21b65be# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607930670244,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930670245,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930675308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930675308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930675308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930675308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930675308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930675308,
                "type": ""
            }
        ],
        "screenShotFile": "00bb00e2-0036-0093-00ac-004c00310096.png",
        "timestamp": 1607930654236,
        "duration": 21219
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 23093,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ea003e-00f3-0026-00d5-0094004d003a.png",
        "timestamp": 1607930657438,
        "duration": 24604
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 23903,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930798163,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=200ab326-7597-4162-9f20-264f841e5b92# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607930812947,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607930812947,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930818202,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930818202,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930818202,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930818202,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930818202,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607930818202,
                "type": ""
            }
        ],
        "screenShotFile": "00f90078-001a-0058-0000-0065000800c9.png",
        "timestamp": 1607930797329,
        "duration": 20987
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 23909,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "000700fc-0004-0073-00bb-002c00480098.png",
        "timestamp": 1607930801296,
        "duration": 24519
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 24651,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931120925,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=07d08a9e-5134-45cc-95b7-dc046155c7c5# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607931135213,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931135213,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931140247,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931140247,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931140247,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931140247,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931140247,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931140247,
                "type": ""
            }
        ],
        "screenShotFile": "00200045-00bf-0084-00b1-0072003f00d3.png",
        "timestamp": 1607931120032,
        "duration": 20376
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 24657,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006a0011-0033-00b5-00f2-007d002900d7.png",
        "timestamp": 1607931123596,
        "duration": 24131
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With Team member|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 25610,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:461:23\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at createprospects.prospect1 (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/CreateProspect.js:42:86)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:25:17)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Creating the Prospect using the Mandatory elements only With Team member\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:24:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "004e0026-00ab-002d-00b6-008100140036.png",
        "timestamp": 1607931241643,
        "duration": 187
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With Team member|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 25744,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/browser.js:461:23\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at createprospects.prospect1 (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/CreateProspect.js:42:86)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:25:17)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Creating the Prospect using the Mandatory elements only With Team member\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:24:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "008a004f-00c5-0087-0086-004f002d00d6.png",
        "timestamp": 1607931258222,
        "duration": 194
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With Team member|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 25911,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931398660,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=c4df30c4-7f0a-421d-9790-24d3e6fcef83# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607931423999,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931424002,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931424005,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931424006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931424006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931424006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931424006,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931424006,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607931430811,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931430813,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931430821,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931430821,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931430821,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931430821,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931430821,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931430821,
                "type": ""
            }
        ],
        "screenShotFile": "0008002d-00bf-0063-00fd-00a500c5007b.png",
        "timestamp": 1607931430781,
        "duration": 24598
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With multiple Team members|Testing the Allocation Tool -- New Prospect",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 26226,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": [
            "Failed: invalid argument: 'value' must be a string\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'value' must be a string\n  (Session info: chrome=87.0.4280.66)\n  (Driver info: chromedriver=87.0.4280.20 (c99e81631faa0b2a448e658c0dbd8311fb04ddbd-refs/branch-heads/4280@{#355}),platform=Linux 5.4.0-53-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: WebDriver.findElements(By(xpath, undefined))\n    at Driver.schedule (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Driver.findElements (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:159:44\n    at ManagedPromise.invokeCallback_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.<computed> [as click] (/usr/local/share/.config/yarn/global/node_modules/protractor/built/element.js:831:22)\n    at createprospects.prospect2 (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/pages/CreateProspect.js:176:100)\n    at UserContext.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:29:17)\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"Creating the Prospect using the Mandatory elements only With multiple Team members\") in control flow\n    at UserContext.<anonymous> (/usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/share/.config/yarn/global/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at /usr/local/share/.config/yarn/global/node_modules/selenium-webdriver/lib/promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:28:1)\n    at addSpecsToSuite (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/share/.config/yarn/global/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/saurabh/Desktop/Saurabh/Way2Automation/Automation/test_spec/Prospect_Module_spec copy.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)\n    at Module.load (internal/modules/cjs/loader.js:928:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:769:14)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931474812,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=cee31f30-7016-422b-9c3d-d8e9f1043d2c# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607931500901,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931500906,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931500917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931500917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931500917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931500917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931500917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931500917,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607931503325,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931503489,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931508875,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931508875,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931508875,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931508875,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931508875,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931508875,
                "type": ""
            }
        ],
        "screenShotFile": "00eb0075-0048-000d-001d-000b0026007f.png",
        "timestamp": 1607931508799,
        "duration": 16758
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 26547,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931546840,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=32821781-1c4f-41dd-b02c-c60a10f5bdb0# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607931561546,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607931561546,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931566583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931566583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931566583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931566583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931566583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607931566583,
                "type": ""
            }
        ],
        "screenShotFile": "00dc004a-0091-001b-0003-00e900cf00ab.png",
        "timestamp": 1607931545991,
        "duration": 20756
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 26553,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "007e00d7-007c-0015-0081-00e90072003c.png",
        "timestamp": 1607931549493,
        "duration": 23957
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 27826,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607933180386,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=229cfd9b-9330-4c0d-bda2-ff555caaccf4# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607933195145,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607933195146,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933200177,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933200177,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933200177,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933200177,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933200177,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933200177,
                "type": ""
            }
        ],
        "screenShotFile": "00050045-006b-002b-00f6-00f5003f003f.png",
        "timestamp": 1607933179380,
        "duration": 20975
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 27832,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004100a7-00fe-00f9-0050-0092009700d0.png",
        "timestamp": 1607933183272,
        "duration": 24848
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With multiple Team members|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 28402,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607933254272,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=c1d62618-a341-421f-9db5-ce8a2f1b6692# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607933279494,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607933279495,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933279497,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933279497,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933279497,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933279497,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933279497,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933279497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607933286049,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607933286050,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933286052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933286052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933286052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933286052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933286052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607933286052,
                "type": ""
            }
        ],
        "screenShotFile": "00db00b2-000d-005c-004f-0079003e00c3.png",
        "timestamp": 1607933285968,
        "duration": 30394
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 1505,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607941835720,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=8c76c2cd-5867-47b9-af3f-8072f4d303fa# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607941850181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607941850181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607941855259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607941855259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607941855259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607941855259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607941855259,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607941855259,
                "type": ""
            }
        ],
        "screenShotFile": "00590045-003a-00fb-0083-003e00a500c4.png",
        "timestamp": 1607941834679,
        "duration": 20769
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 1511,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "000a0006-0029-006c-003f-00e500d800d7.png",
        "timestamp": 1607941838008,
        "duration": 24242
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 2964,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607942630755,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=034b35e5-41f7-456e-8590-bfdcb76e1afc# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607942645404,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607942645406,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942650518,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942650518,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942650518,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942650518,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942650518,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942650518,
                "type": ""
            }
        ],
        "screenShotFile": "00d500cf-0092-0067-00e7-001d00010042.png",
        "timestamp": 1607942629893,
        "duration": 20781
    },
    {
        "description": "Login as Saurabh|Login in Zepplin Test",
        "passed": true,
        "pending": false,
        "os": "linux",
        "instanceId": 2970,
        "browser": {
            "name": "firefox",
            "version": "83.0"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e30016-0093-00f3-0038-004b00c300ff.png",
        "timestamp": 1607942633809,
        "duration": 24826
    },
    {
        "description": "Creating the Prospect using the Mandatory elements only With multiple Team members|Testing the Allocation Tool -- New Prospect",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 3853,
        "browser": {
            "name": "chrome",
            "version": "87.0.4280.66"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607942699222,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/auth/verify?code=709fbb71-4aaf-4255-b28f-3e0fe2ba97b1# - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607942724677,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607942724678,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942724683,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942724683,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942724683,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942724683,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942724683,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/self/wfh - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942724683,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://dev.zeppl.in/allocation-tool - Failed to load resource: the server responded with a status of 403 ()",
                "timestamp": 1607942727263,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/main.f4017ca6a4049b53093d.js 0:1110158 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1607942727432,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942732887,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Medium.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942732887,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Noteworthy-Light.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942732887,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Heavy.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942732887,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/Avenir-Book.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942732887,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://dev.zeppl.in/allocation-tool - The resource https://dev.zeppl.in/assets/fonts/noteworthy-bold.ttf was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1607942732887,
                "type": ""
            }
        ],
        "screenShotFile": "009d0045-00d2-0047-00f8-00a100690018.png",
        "timestamp": 1607942732875,
        "duration": 30692
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
