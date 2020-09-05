chrome.webRequest.onCompleted.addListener(
    function(details) {
        console.log(details);
        chrome.tabs.query({currentWindow: true,active: true}, function(tabs){ 
            chrome.tabs.sendMessage(tabs[0].id, {event: 'updates'});
            //port = chrome.tabs.connect(tabs[0].id,{name: "channelName"});
            //port.postMessage({event: 'updates'});
        });
        
        
        //return {cancel: details.url.indexOf("allData") != -1};
    },
    {urls: ["<all_urls>"]});