var MAX_CONCURRENT_DOWNLOADS = 5;

var folderName = "";
var numDownloading = 0;
var numFinished = 0;
var downloadIds = [];
var queue = [];
var n = 1;

//CONFIG sets [DEV | PROD]
var CONFIG = {
    DEV: {
        default: "#077dec",
        active: "#077dec",
        complete: "#077dec",
        badgeAppendage: "*"
    },
    PROD: {
        default: "#717171",
        active: "#ff0000",
        complete: "#00cc00",
        badgeAppendage: ""
    }
}

var currentConfig = CONFIG.DEV;

//load max concurrent downloads option
chrome.storage.sync.get(
    {
        concurrent_downloads: MAX_CONCURRENT_DOWNLOADS
    },
    function (items) {
        MAX_CONCURRENT_DOWNLOADS = items.concurrent_downloads;
    }
);

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.message == "getStats") {
            sendStats();
        }

        if (request.message == "addToQueue") {
            queue = queue.concat(request.urls);
            processQueue();
        }

        if (request.message == "clearDownloads") {
            numDownloading = 0;
            numFinished = 0;
            resetBadge();
            n = 0;
            downloadIds = [];
            queue = [];
            sendStats();
        }
    }
);

function resetBadge() {
    chrome.browserAction.setBadgeText({ text: "0" + currentConfig.badgeAppendage });
    chrome.browserAction.setBadgeBackgroundColor({ color: currentConfig.default });
}

resetBadge();

function sendStats() {
    chrome.runtime.sendMessage({ "message": "stats", "numDownloading": numDownloading, "numQueued": queue.length, "numFinished": numFinished });
}

function padNumber(n, l, p) {
    var o = "";
    for (var i = n.toString().length; i < l; i++) {
        o = o + p;
    }

    o = o + n.toString();

    return o;
}

function datestamp(d) {
    var date = d;

    return (
        padNumber(date.getFullYear(), 4, "0") +
        padNumber((date.getMonth() + 1), 2, "0") +
        padNumber(date.getDate(), 2, "0")
    );
}

chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
    suggest({filename: folderName + "/" + item.filename});
});

function cleanFolderName(f) {
    return f.replace(/\W/g, "-");
}

function processQueue() {
    if (queue.length === 0) {
        n = 1;
    }

    while (queue.length > 0 && numDownloading < MAX_CONCURRENT_DOWNLOADS) {
        var d = new Date();
        var url = queue.pop();
        folderName = "_getter" + "/" + datestamp(d) + "/" + cleanFolderName(url.t);
        numDownloading++;
        n++;
        
        chrome.downloads.download({ "url": url.u }, function (downloadId) {
                downloadIds.push(downloadId);
            });

        var inFlight = queue.length;
        chrome.browserAction.setBadgeText({ text: inFlight.toString() + currentConfig.badgeAppendage });
        var badgeBgColour = inFlight > 0 ? currentConfig.active : currentConfig.complete;
        chrome.browserAction.setBadgeBackgroundColor({ color: badgeBgColour });
    }

    sendStats();
}

chrome.downloads.onChanged.addListener(function (downloadDelta) {
    if (downloadIds.indexOf(downloadDelta.id) >= 0) {
        if (downloadDelta.state != undefined && downloadDelta.state.current != "in_progress") {
            downloadIds.splice(downloadIds.indexOf(downloadDelta.id), 1);
            numDownloading--;
            numFinished++;
            processQueue();
        }
    }

    sendStats();
});
