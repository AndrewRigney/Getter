$(document).ready(function () {
    var activeTab;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, { "message": "getLinks" });
    });

    chrome.runtime.sendMessage({ "message": "getStats" });

    //load wildcard pattern option and bind it to the popup UI
    chrome.storage.sync.get(
        {
            pattern: "*.jpg"
        },
        function (items) {
            $("#patternInput").val(items.pattern);
        }
    );

    $('#selectButton').click(function () {
        $('#listTable tr.link.selected').find('input.checkbox').prop('checked', true).change();
    });

    $('#deselectButton').click(function () {
        $('#listTable tr.link.selected').find('input.checkbox').prop('checked', false).change();
    });

    $('#startButton').click(function () {
        var urls = [];
        $('#listTable input.checkbox:checked').parent().parent().find('td.url').each(function (i, el) {
            urls.push({ "u" : $(el).attr('title'), "t" : activeTab.title});
        });
        chrome.runtime.sendMessage({ "message": "addToQueue", "urls": urls });
    });

    $('#closeButton').click(function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var activeTab = tabs[0];
            chrome.tabs.remove(activeTab.id);
        });
    });

    $('#reloadButton').click(function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var activeTab = tabs[0];
            chrome.tabs.update(activeTab.id, { url: activeTab.url });
        });
    });

    $('#quickstartButton').click(function () {
        $('#patternButton').trigger('click');
        setTimeout(function () {
            $('#startButton').trigger('click');
        }, 500);
        setTimeout(function () {
            $('#closeButton').trigger('click');
        }, 1000);
    });

    $('#patternButton').click(function () {
        var regexPattern = globStringToRegex($('#patternInput').val());
        $('#listTable td.url').each(function (i, el) {
            var url = $(el).attr('title');
            if (url != undefined && url.toLowerCase().match(regexPattern)) {
                $(el).parent().find('input.checkbox').prop('checked', true).change();
            };
        });
    });

    $('#clearDownloads').click(function () {
        chrome.runtime.sendMessage({ "message": "clearDownloads" });
    });

});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.message == "stats") {

        if ($('#numDownloading').text() != request.numDownloading) {
            $('#numDownloading').removeClass('statsNumberAnimated');
            setTimeout(function () { $('#numDownloading').addClass('statsNumberAnimated') }, 0);
        }
        if ($('#numQueued').text() != request.numQueued) {
            $('#numQueued').removeClass('statsNumberAnimated');
            setTimeout(function () { $('#numQueued').addClass('statsNumberAnimated') }, 0);
        }
        if ($('#numFinished').text() != request.numFinished) {
            $('#numFinished').removeClass('statsNumberAnimated');
            setTimeout(function () { $('#numFinished').addClass('statsNumberAnimated') }, 0);
        }

        $('#numDownloading').text(request.numDownloading);
        $('#numQueued').text(request.numQueued);
        $('#numFinished').text(request.numFinished);

    }

    if (request.message == "links") {

        $('#listTable').html('');

        if (request.links.length > 0) {
            $(request.links).each(function (i, val) {
                var row = $('<tr class="link"><td class="checkbox"><input type="checkbox" class="checkbox"></td><td class="url"><span class="part1"></span><span class="part2"></span><span class="part3"></span></td><td class="description"></td></tr>');
                row.find('td.description').text(val.description);

                var match;
                if (match = val.url.match(/^(.*\/)?([^\/\?]+)(\?.*)$/)) {
                    row.find('td.url span.part2').text(match[2]);
                    row.find('td.url span.part3').text(match[3]);
                } else if (match = val.url.match(/^(.*\/)?([^\/\?]+)$/)) {
                    row.find('td.url span.part2').text(match[2]);
                } else {
                    row.find('td.url span.part1').text(val.url);
                }

                row.find('td.url').attr('title', val.url);
                $('#listTable').append(row);
            });
        }
        else {
            $('#listTable').html('<tr><td class="checkbox"></td><td class="url"><span class="part3">No links found on the page.</span></span></td><td class="Description"></td></tr>');
        }

        $('#listTable input.checkbox').change(function () {
            if ($(this).is(':checked')) {
                $(this).parent().parent().addClass('green');
            } else {
                $(this).parent().parent().removeClass('green');
            }

            var numberOfFiles = $('#listTable input.checkbox:checked').length;
            $('#startButtonCounter').text(numberOfFiles);
            if (numberOfFiles > 0) {
                $('#startButton').prop('disabled', false);
            } else {
                $('#startButton').prop('disabled', true);
            }
        });

        $('#listTable tr.link').mousedown(function () {
            if (!shift) {
                selectStart = $(this).index();
                selectEnd = selectStart;
            } else {
                selectEnd = $(this).index();
            }
            selecting = true;
            drawSelection();
        });

        $('#listTable tr.link').mouseover(function () {
            if (selecting) {
                selectEnd = $(this).index();
                drawSelection();
            }
        });

        $(document).mouseup(function () {
            selecting = false;
            drawSelection();
        });

        drawSelection();
    }

});

// Selection variables
var selecting = false;
var selectStart = 0;
var selectEnd = 0;

// Draw selection
function drawSelection() {
    $('#listTable tr.link').each(function (i, el) {
        if (i >= Math.min(selectStart, selectEnd) && i <= Math.max(selectStart, selectEnd)) {
            $(el).addClass('selected');
        } else {
            $(el).removeClass('selected');
        }
    });
}

// Is shift pressed?
var shift = false;
$(document).on('keyup keydown', function (e) {
    shift = e.shiftKey
});

// When pressing space, mark all the selected files for download. If all selected files are marked, then deselect all.
$(document).keypress(function (e) {

    // Space key?
    if (e.keyCode == 32) {

        // All selected files marked for download?
        var allMarked = true;
        !$('#listTable tr.link.selected').find('input.checkbox').each(function (i, el) {
            if (!$(el).is(':checked')) allMarked = false;
        });

        // Mark files.
        $('#listTable tr.link.selected').find('input.checkbox').prop('checked', !allMarked).change();

        // Don't scroll down. (Browser usually scrolls down when you press spacebar.)
        return false;
    }
});

function globStringToRegex(str) {
    return new RegExp(preg_quote(str).replace(/\\\*/g, '.*').replace(/\\\?/g, '.'), 'g');
}

function preg_quote(str, delimiter) {
    return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}
