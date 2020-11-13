chrome.webRequest.onCompleted.addListener(
    function(details) {
        var url = details.url.toString();
        if (url.indexOf('?')>0 && url.indexOf("avatar")<0  && url.indexOf("scriptru")<0   && url.indexOf("menu")<0
        && url.indexOf("/s/")<0  && url.indexOf("greenh")>0  && url.indexOf("tempo")<0)
        {    
            console.log("details:" + details.url);
            chrome.tabs.query({currentWindow: true,active: true}, function(tabs){ 
                chrome.tabs.sendMessage(tabs[0].id, {event: 'updates'});
                });
        }
    },
    {urls: ["<all_urls>"]});

    window.chrome.webRequest.onBeforeRequest.addListener(
        function(){
            console.log("canceling");
            return {
                cancel: true,
            };
        },
        {
            urls: ["https://jiracloud.cit.com.br/rest/greenhopper/1.0/xboard/work/allData.json?rapidViewId=35218&selectedProjectKey=QUAL&etag=*"]
        },
        ["blocking"]

    );