var MAX_CONCURRENT_DOWNLOADS = 5;

var numDownloading = 0;
var numFinished = 0;
var downloadIds = [];
var queue = [];
var n = 1;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.message == "getStats") {
            sendStats();
        }
        if (request.message == "addToQueue") {
            queue = queue.concat(request.urls);
            try {
                processQueue();
            }
            catch (err) {
                console.error(err);
            }

        }
        if (request.message == "clearDownloads") {
            numDownloading = 0;
            numFinished = 0;
            n = 0;
            downloadIds = [];
            queue = [];
            sendStats();
        }
    }
);

chrome.browserAction.setBadgeText({ text: "0" });
chrome.browserAction.setBadgeBackgroundColor({ color: "#717171" });

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

function timestamp() {
    var date = new Date();

    return padNumber(date.getFullYear(), 4, "0") +
        padNumber((date.getMonth() + 1), 2, "0") +
        padNumber(date.getDate(), 2, "0") +
        padNumber(date.getHours(), 2, "0") +
        padNumber(date.getMinutes(), 2, "0") +
        padNumber(date.getSeconds(), 2, "0") +
        padNumber(date.getMilliseconds(), 3, "0");
}

function extension(filename) {
    try {
        var idx = filename.lastIndexOf('.');
        return (idx < 1) ? "" : filename.substr(idx + 1);
    } catch (err) {
        return "download";
    }
}

function processQueue() {
    if (queue.length === 0) {
        n = 1;
    }

    while (queue.length > 0 && numDownloading < MAX_CONCURRENT_DOWNLOADS) {
        try {
            var url = queue.pop();
            var filename = timestamp() + "-" + padNumber(n, 4, "0") + "." + extension(url);
            numDownloading++;
            n++;
            chrome.downloads.download({ "url": url, "filename": filename }, function (downloadId) {
                downloadIds.push(downloadId);
            });
        } catch (err) {
            console.error(err);
        }

        var inFlight = queue.length;
        chrome.browserAction.setBadgeText({ text: inFlight.toString() });
        var badgeBgColour = inFlight > 0 ? "#FF0000" : "#717171";
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
