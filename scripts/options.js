// Saves options to chrome.storage
function save_options() {
    var pattern = document.getElementById("pattern").value;
    var concurrent_downloads = document.getElementById("concurrent_downloads").value;

    chrome.storage.sync.set(
      {
        pattern: pattern,
        concurrent_downloads: concurrent_downloads
      },
      function() {
        // Update status to let user know options were saved.
        var status = document.getElementById("status");
        status.textContent = "Options saved.";
        setTimeout(function() {
          status.textContent = "";
        }, 750);
      }
    );
  }
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  function restore_options() {
    // Use default values.
    chrome.storage.sync.get(
      {
        pattern: "*.jp*g",
        concurrent_downloads: 3
      },
      function(items) {
        document.getElementById("pattern").value = items.pattern;
        document.getElementById("concurrent_downloads").value = items.concurrent_downloads;
      }
    );
  }
  document.addEventListener("DOMContentLoaded", restore_options);
  document.getElementById("save").addEventListener("click", save_options);